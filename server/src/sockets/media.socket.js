import { getBrowserManager } from './browser.socket.js';
import logger from '../logger.js';
import { getUser, getRoom, saveRoom } from '../redis.js';
import { sanitizeRoomId } from '../utils/sanitize.js';
import eventLogger from '../services/EventLogger.js';

export default function registerMediaHandlers(io, socket, sfuHandler) {
  socket.on('start-screen-share', async ({ roomId, streamId }) => {
    const rid = sanitizeRoomId(roomId);
    if (!rid) return;
    const user = socket.user || (await getUser(socket.id));
    if (user) {
      socket.to(rid).emit('user-started-screen-share', { userId: user.id, streamId });
      logger.info(`User ${user.id} started screen share in room ${rid}`);
      eventLogger.logRoomEvent(rid, user.id, 'share', { streamId, type: 'screen' });
    }
  });

  socket.on('stop-screen-share', async ({ roomId }) => {
    const rid = sanitizeRoomId(roomId);
    if (!rid) return;
    const user = socket.user || (await getUser(socket.id));
    if (user) {
      socket.to(rid).emit('user-stopped-screen-share', { userId: user.id });
      eventLogger.logRoomEvent(rid, user.id, 'stop_share', { type: 'screen' });
    }
  });

  // Legacy WebRTC Signaling (if still used alongside SFU)
  socket.on('offer', (payload) => io.to(payload.target).emit('offer', payload));
  socket.on('answer', (payload) => io.to(payload.target).emit('answer', payload));
  socket.on('ice-candidate', (incoming) => io.to(incoming.target).emit('ice-candidate', incoming));
  
  // YouTube Sync
  // YouTube Sync via Virtual Browser
  // This maps the frontend "Sync YouTube" intent to the Cloud Browser logic
  socket.on('sync-youtube', async ({ roomId, url }) => {
    const rid = sanitizeRoomId(roomId);
    if (!rid) return;
    const browserUrl = url && typeof url === 'string' ? (url.startsWith('http') ? url : `https://www.youtube.com/watch?v=${url}`) : '';
    if (!browserUrl) return;
    logger.info(`[YouTube] Converting sync-youtube to browser session: ${browserUrl}`);
    const room = await getRoom(rid);
    if (room) {
      try {
        const manager = getBrowserManager(rid);
        if (manager && manager.navigate) {
          await manager.navigate(browserUrl);
          room.virtualBrowser = { url: browserUrl, isActive: true };
          await saveRoom(room);
          io.to(rid).emit('browser-started', { url: browserUrl, mode: 'youtube' });
        } else {
          socket.emit('error', 'Start virtual browser first from the room.');
        }
      } catch (e) {
        socket.emit('error', 'Failed to start YouTube session: ' + (e?.message || 'Unknown'));
      }
    }
  });

  socket.on('youtube-control', async ({ roomId, action, time }) => {
    const rid = sanitizeRoomId(roomId);
    if (!rid) return;
    const manager = getBrowserManager(rid);
    if (!manager || typeof manager.handleInput !== 'function') return;
    try {
      await manager.handleInput({ type: 'youtube-control', action, time });
    } catch (e) {
      logger.debug('youtube-control error:', e.message);
    }
  });

  socket.on('start-browser', async ({ roomId, url }) => {
    const rid = sanitizeRoomId(roomId);
    if (!rid) return;
    const safeUrl = typeof url === 'string' ? url.trim().slice(0, 2048) : '';
    if (!safeUrl || (!safeUrl.startsWith('http://') && !safeUrl.startsWith('https://'))) {
      socket.emit('error', 'Valid URL required');
      return;
    }
    logger.info(`[VirtualBrowser] start-browser for room ${rid}, URL: ${safeUrl}`);
    const room = await getRoom(rid);
    if (!room) {
      socket.emit('error', 'Room not found');
      return;
    }
    const manager = getBrowserManager(rid);
    if (manager && manager.navigate) {
      try {
        await manager.navigate(safeUrl);
        room.virtualBrowser = { url: safeUrl, isActive: true };
        await saveRoom(room);
        io.to(rid).emit('browser-started', { url: safeUrl });
      } catch (e) {
        socket.emit('error', 'Failed to navigate: ' + (e?.message || 'Unknown'));
      }
    } else {
      socket.emit('error', 'Start virtual browser first from the room.');
    }
  });

  socket.on('update-browser-url', async ({ roomId, url }) => {
    const rid = sanitizeRoomId(roomId);
    if (!rid) return;
    const manager = getBrowserManager(rid);
    if (!manager || !manager.navigate) return;
    const safeUrl = typeof url === 'string' ? url.trim().slice(0, 2048) : '';
    if (!safeUrl || (!safeUrl.startsWith('http://') && !safeUrl.startsWith('https://'))) return;
    try {
      await manager.navigate(safeUrl);
      const room = await getRoom(rid);
      if (room && room.virtualBrowser) {
        room.virtualBrowser.url = safeUrl;
        await saveRoom(room);
      }
      io.to(rid).emit('browser-url-updated', { url: safeUrl });
    } catch (e) {
      logger.debug('update-browser-url error:', e?.message);
    }
  });

  socket.on('browser-input', async ({ roomId, input }) => {
    const rid = sanitizeRoomId(roomId);
    if (!rid || !input) return;
    const manager = getBrowserManager(rid);
    if (!manager || typeof manager.handleInput !== 'function') return;
    try {
      await manager.handleInput(input);
    } catch (e) {
      if (!e?.message?.includes('Target closed') && !e?.message?.includes('Session closed')) {
        logger.debug('browser-input error:', e?.message);
      }
    }
  });

  socket.on('close-browser', async ({ roomId }) => {
    const rid = sanitizeRoomId(roomId);
    if (!rid) return;
    const room = await getRoom(rid);
    if (room) {
      delete room.virtualBrowser;
      await saveRoom(room);
    }
    io.to(rid).emit('browser-closed');
  });
}
