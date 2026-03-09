import logger from '../logger.js';
import BrowserPool from '../browser/BrowserPool.js';
import { getRoom, saveRoom } from '../redis.js';
import { sanitizeRoomId } from '../utils/sanitize.js';
import { parseIntent, validateAction } from '../services/ai/BrowserIntentParser.js';
import BrowserActionExecutor from '../services/ai/BrowserActionExecutor.js';
import llmService from '../services/ai/LLMService.js';

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

// Action Executor
const actionExecutor = new BrowserActionExecutor(browserPool);

export default function registerBrowserHandlers(io, socket, sfuHandler) {
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
        // Create the manager through the pool.
        // We use the sfuHandler passed from index.js
        manager = await browserPool.createSession(userId, sessionId, {
          io,
          sfuHandler,
          viewport: viewport || { width: 1280, height: 720 },
          quality: 60,
          enableAudio: true,
          roomId: rid
        });

        manager.on('crash', async () => {
          logger.error(`[Browser] Crash detected. Cleaning up room ${rid}`);
          await browserPool.closeSession(userId, sessionId);
          roomSessions.delete(rid);
          const roomToUpdate = await getRoom(rid);
          if (roomToUpdate) {
            delete roomToUpdate.virtualBrowser;
            await saveRoom(roomToUpdate);
          }
          io.to(rid).emit('browser-closed');
        });

        roomSessions.set(rid, sessionId);

        // Actually start the WebRTC session now
        await manager.startSession(rid, url || 'https://www.google.com');

        manager.once('closed', () => {
          roomSessions.delete(rid);
        });

        // We don't call navigate here again because startSession already navigates


        const room = await getRoom(rid);
        if (room) {
          room.virtualBrowser = { 
            url: url || 'https://www.google.com', 
            isActive: true,
            sessionId: sessionId 
          };
          await saveRoom(room);
        }

        io.to(rid).emit('browser-started', { 
          url: url || 'https://www.google.com' 
        });
      } else {
        // If session exists but a new URL is provided, navigate
        if (url && url !== manager.currentUrl) {
          await manager.navigate(url);
          
          const room = await getRoom(rid);
          if (room) {
            room.virtualBrowser = { 
              ...room.virtualBrowser,
              url: url
            };
            await saveRoom(room);
          }

          io.to(rid).emit('browser-url-updated', { url });
        }
      }

      socket.emit('virtual-browser-ready', {
        roomId: rid,
        url: manager.currentUrl || url || 'https://www.google.com',
        stats: manager.getStats(),
        tabs: Array.from(manager.getSession()?.pages?.values() || []).map(t => ({ id: t.id, url: t.url, title: t.title })),
        activeTabId: manager.getSession()?.activeTabId
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
    } catch (error) {
      logger.error(`Navigation error: ${error.message}`);
    }
  });

  socket.on('browser-new-tab', async (data) => {
    try {
      const { roomId, tabId, url } = data || {};
      const rid = sanitizeRoomId(roomId);
      if (!rid || !tabId) return;
      const manager = getBrowserManager(rid);
      if (manager) await manager.createTab(tabId, url || 'https://www.google.com', true);
    } catch (e) { logger.error(e.message); }
  });

  socket.on('browser-switch-tab', async (data) => {
    try {
      const { roomId, tabId } = data || {};
      const rid = sanitizeRoomId(roomId);
      if (!rid || !tabId) return;
      const manager = getBrowserManager(rid);
      if (manager) await manager.switchTab(tabId);
    } catch (e) { logger.error(e.message); }
  });

  socket.on('browser-close-tab', async (data) => {
    try {
      const { roomId, tabId } = data || {};
      const rid = sanitizeRoomId(roomId);
      if (!rid || !tabId) return;
      const manager = getBrowserManager(rid);
      if (manager) await manager.closeTab(tabId);
    } catch (e) { logger.error(e.message); }
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

      if (!manager.activePage) return;

      if (input.type === 'navigate') {
        switch (input.action) {
          case 'back':
            if (manager.activePage) await manager.activePage.goBack().catch(()=>{});
            break;
          case 'forward':
            if (manager.activePage) await manager.activePage.goForward().catch(()=>{});
            break;
          case 'reload':
            if (manager.activePage) await manager.activePage.reload().catch(()=>{});
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
   * Handle AI Agent Commands
   */
  socket.on('browser-command', async (data, callback) => {
    try {
      const { roomId, command } = data || {};
      const rid = sanitizeRoomId(roomId);
      if (!rid || !command) return;

      logger.info(`[BrowserAgent] Received command for room ${rid}: "${command}"`);

      // 1. Parse Intent
      const action = parseIntent(command);
      
      if (action.error && action.action !== 'unknown') {
        return callback?.({ success: false, error: action.error });
      }

      // 2. Validate
      const validation = validateAction(action);
      if (!validation.valid) {
        return callback?.({ success: false, error: validation.error });
      }

      // 3. Special Case: AI Summary / Generation
      if (command.toLowerCase().includes('summarize') || command.toLowerCase().includes('what is this page about')) {
        const manager = getBrowserManager(rid);
        if (manager && manager.activePage) {
          const content = await manager.activePage.textContent('body');
          const summary = await llmService.generateContent(`Summarize the following web page content concisely for a user in a watch party:\n\n${content.substring(0, 5000)}`);
          io.to(rid).emit('browser-announcement', { 
            type: 'ai-insight', 
            message: summary,
            title: 'AI Page Summary'
          });
          return callback?.({ success: true, message: 'Summary generated' });
        }
      }

      // 4. Execute Browser Action
      const result = await actionExecutor.executeAction(rid, action);
      
      if (result.success) {
        callback?.({ success: true, message: result.message });
        // Optionally announce significant actions
        if (['navigate', 'search'].includes(action.action)) {
          io.to(rid).emit('browser-announcement', { 
            type: 'action', 
            message: result.message 
          });
        }
      } else {
        callback?.({ success: false, error: result.error });
      }

    } catch (error) {
      logger.error(`[BrowserAgent] Command error: ${error.message}`);
      callback?.({ success: false, error: 'Failed to process AI command' });
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
      
      const room = await getRoom(rid);
      if (room) {
        delete room.virtualBrowser;
        await saveRoom(room);
      }

      io.to(rid).emit('browser-closed');
      logger.info(`Browser closed for room ${rid}`);
    } catch (error) {
      logger.error(`Close browser error: ${error.message}`);
    }
  });

  socket.on('stop-virtual-browser', async (data) => {
    try {
      const { roomId } = data || {};
      const rid = sanitizeRoomId(roomId);
      if (!rid) return;

      const sessionId = roomSessions.get(rid);
      if (!sessionId) return;

      const userId = socket.handshake.auth?.userId || socket.id;
      await browserPool.closeSession(userId, sessionId);
      
      roomSessions.delete(rid);

      const room = await getRoom(rid);
      if (room) {
        delete room.virtualBrowser;
        await saveRoom(room);
      }

      io.to(rid).emit('browser-closed');
      logger.info(`Browser stopped for room ${rid}`);
    } catch (error) {
      logger.error(`Stop browser error: ${error.message}`);
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
