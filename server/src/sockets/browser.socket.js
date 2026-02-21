import logger from '../logger.js';
import BrowserPool from '../browser/BrowserPool.js';
import { getRoom } from '../redis.js';
import { sanitizeRoomId } from '../utils/sanitize.js';

// Initialize browser pool (singleton)
const browserPool = new BrowserPool({
  maxConcurrentSessions: 100,
  maxSessionsPerUser: 2,
  rateLimit: {
    maxRequests: 20,
    windowMs: 60000,
  },
});

// Track room-to-session mapping
const roomSessions = new Map(); // roomId -> sessionId

export default function registerBrowserHandlers(io, socket) {
  /**
   * Start virtual browser session
   */
  socket.on('start-virtual-browser', async (data) => {
    try {
      const { roomId, url, viewport, enableAudio = false } = data || {};
      const rid = sanitizeRoomId(roomId);
      if (!rid) {
        socket.emit('error', 'Room ID required');
        return;
      }
      const userId = socket.handshake.auth?.userId || socket.id;

      logger.info(`Starting virtual browser for user ${userId} in room ${rid}, URL: ${url || 'default'}, Audio: ${enableAudio}`);

      const sessionId = `browser-${rid}`;
      let manager = browserPool.getSession(sessionId);
      
      if (!manager) {
        manager = await browserPool.createSession(userId, sessionId, {
          viewport: viewport || { width: 390, height: 844 },
          quality: 60,
          enableAudio,
          roomId: rid
        });

        roomSessions.set(rid, sessionId);

        manager.startFrameCapture((data) => {
          if (data.type === 'audio') {
            io.to(rid).emit('browser-audio', data);
          } else {
            io.to(rid).emit('browser-frame', data);
          }
        });

        manager.once('closed', () => {
          roomSessions.delete(rid);
        });

        if (url) {
          await manager.navigate(url);
        }

        io.to(rid).emit('browser-started', { 
          url: url || 'https://www.google.com' 
        });
      }

      socket.emit('virtual-browser-ready', {
        roomId: rid,
        url: url || 'https://www.google.com',
        stats: manager.getStats()
      });

    } catch (error) {
      logger.error(`Error starting virtual browser: ${error.message}`);
      socket.emit('error', `Failed to start browser: ${error.message}`);
    }
  });

  /**
   * Navigate to URL
   */
  socket.on('browser-navigate', async (data) => {
    try {
      const { roomId, url } = data || {};
      const rid = sanitizeRoomId(roomId);
      if (!rid || !url || typeof url !== 'string') return;

      const sessionId = roomSessions.get(rid);
      if (!sessionId) {
        logger.warn(`No browser session for room ${rid}`);
        return;
      }

      const manager = browserPool.getSession(sessionId);
      if (!manager) {
        logger.warn(`Browser manager not found for session ${sessionId}`);
        roomSessions.delete(rid);
        return;
      }

      const safeUrl = url.trim().slice(0, 2048);
      if (!safeUrl.startsWith('http://') && !safeUrl.startsWith('https://')) return;
      await manager.navigate(safeUrl);
      io.to(rid).emit('browser-url-updated', { url: safeUrl });
    } catch (error) {
      logger.error(`Navigation error: ${error.message}`);
    }
  });

  /**
   * Handle browser input - host/co-host only, with null checks
   */
  socket.on('browser-input', async (data) => {
    try {
      const { roomId, input } = data || {};
      const rid = sanitizeRoomId(roomId);
      if (!rid || !input) return;

      const room = await getRoom(rid);
      const userId = socket.handshake.auth?.userId || socket.user?.id || socket.id;
      const isHost = room && room.hostId === userId;
      const isCoHost = room && Array.isArray(room.coHosts) && room.coHosts.includes(userId);
      if (!isHost && !isCoHost) {
        return;
      }

      const sessionId = roomSessions.get(rid);
      if (!sessionId) return;

      const manager = browserPool.getSession(sessionId);
      if (!manager) {
        roomSessions.delete(rid);
        return;
      }

      if (!manager.page) return;

      if (input.type === 'navigate') {
        switch (input.action) {
          case 'back':
            if (manager.page) await manager.page.goBack();
            break;
          case 'forward':
            if (manager.page) await manager.page.goForward();
            break;
          case 'reload':
            if (manager.page) await manager.page.reload();
            break;
        }
        return;
      }

      await manager.handleInput(input);
    } catch (error) {
      if (error.message && !error.message.includes('Target closed') && !error.message.includes('Session closed')) {
        logger.debug(`Browser input error: ${error.message}`);
      }
    }
  });

  /**
   * Network conditions update
   */
  socket.on('browser-network-update', (data) => {
    try {
      const { roomId, latency, bandwidth } = data || {};
      const rid = sanitizeRoomId(roomId);
      if (!rid) return;
      
      const sessionId = roomSessions.get(rid);
      if (!sessionId) return;

      const manager = browserPool.getSession(sessionId);
      if (manager) {
        manager.updateNetworkConditions(latency, bandwidth);
      }
    } catch (e) {
      // Silent
    }
  });

  socket.on('close-browser', async (data) => {
    try {
      const { roomId } = data || {};
      const rid = sanitizeRoomId(roomId);
      if (!rid) return;

      const sessionId = roomSessions.get(rid);
      if (!sessionId) return;

      const userId = socket.handshake.auth?.userId || socket.id;
      await browserPool.closeSession(userId, sessionId);

      roomSessions.delete(rid);
      io.to(rid).emit('browser-closed');

      logger.info(`Browser closed for room ${rid} (close-browser)`);
    } catch (error) {
      logger.error(`Close browser error: ${error.message}`);
    }
  });

  /**
   * Close browser
   */
  socket.on('stop-virtual-browser', async (data) => {
    try {
      const { roomId } = data;
      if (!roomId) return;

      const sessionId = roomSessions.get(roomId);
      if (!sessionId) return;

      const userId = socket.handshake.auth?.userId || socket.id;
      await browserPool.closeSession(userId, sessionId);
      
      roomSessions.delete(roomId);
      io.to(roomId).emit('browser-closed');
      
      logger.info(`Browser closed for room ${roomId}`);
    } catch (error) {
      logger.error(`Close browser error: ${error.message}`);
    }
  });

  /**
   * Cleanup on disconnect
   */
  socket.on('disconnect', async () => {
    // Find and cleanup any sessions owned by this socket
    const userId = socket.handshake.auth?.userId || socket.id;
    
    for (const [roomId, sessionId] of roomSessions.entries()) {
      if (sessionId.includes(userId)) { // Assuming sessionId contains userId for identification
        await browserPool.closeSession(userId, sessionId);
        roomSessions.delete(roomId);
        logger.info(`Cleaned up session ${sessionId} for disconnected user ${userId}`);
      }
    }
  });
}

export function getBrowserManager(roomId) {
  const sessionId = roomSessions.get(roomId);
  return sessionId ? browserPool.getSession(sessionId) : null;
}

export { browserPool };
