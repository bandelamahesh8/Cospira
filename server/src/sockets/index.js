import registerRoomHandlers from './rooms.socket.js';
import registerGameHandlers from './games.socket.js';
import registerChatHandlers from './chat.socket.js';
import registerMediaHandlers from './media.socket.js';
import registerBrowserHandlers from './browser.socket.js';

import registerAIHandlers from './ai.socket.js';
import registerRoomIntelligenceHandlers from './room-intelligence.socket.js';
import registerAnalyticsHandlers from './analytics.socket.js';
import registerSummaryHandlers from './summary.socket.js';
import registerTimelineHandlers from './timeline.socket.js';
import registerQualityHandlers from './quality.socket.js';
import registerAdminHandlers from './admin.socket.js';
import registerAssistantHandlers from './assistant.socket.js';
import registerRandomHandlers from './random.socket.js';
import registerMatchmakingHandlers from './matchmaking.socket.js';
import registerChessHandlers from './chess.socket.js';
import registerLudoHandlers from './ludo.socket.js';
import { getSystemStats } from '../redis.js';
import logger from '../logger.js';

export default function registerSocketHandlers(io, sfuHandler) {
  // Maps userId -> socketId
  const userSockets = new Map();

  const broadcastStats = async () => {
    try {
      const stats = await getSystemStats();
      io.emit('stats-updated', stats);
    } catch (err) {
      logger.error('Error broadcasting stats:', err);
    }
  };

  io.on('connection', (socket) => {
    // Broadcast stats to everyone on new connection
    broadcastStats();
    // Single Session Enforcement (Skip in Dev)
    if (socket.user && socket.user.sub && process.env.NODE_ENV === 'production') {
      const userId = socket.user.sub;
      const existingSocketId = userSockets.get(userId);

      if (existingSocketId && existingSocketId !== socket.id) {
        // Force logout the previous session
        io.to(existingSocketId).emit('force_logout', { 
           reason: 'New login detected from another device/tab.' 
        });
        
        // Optional: Disconnect the old socket after a short delay
        const oldSocket = io.sockets.sockets.get(existingSocketId);
        if (oldSocket) {
             oldSocket.disconnect(true);
        }
      }

      // Register the new session
      userSockets.set(userId, socket.id);
    } else if (socket.user && socket.user.sub) {
      // In dev, just track the latest socket but don't kick
      userSockets.set(socket.user.sub, socket.id);
    }

    // 1. Initialize SFU (standard events)
    sfuHandler.setupSocketEvents(socket);

    // 2. Register feature-specific handlers
    registerRoomHandlers(io, socket, sfuHandler);
    registerGameHandlers(io, socket);
    registerChatHandlers(io, socket);
    registerMediaHandlers(io, socket, sfuHandler);
    registerBrowserHandlers(io, socket, sfuHandler);
    registerAIHandlers(io, socket);
    registerRoomIntelligenceHandlers(io, socket);
    registerAnalyticsHandlers(io, socket);
    registerSummaryHandlers(io, socket);
    registerTimelineHandlers(io, socket);
    registerQualityHandlers(io, socket);
    registerAdminHandlers(io, socket);
    registerAssistantHandlers(io, socket, sfuHandler);
    registerRandomHandlers(io, socket);
    registerMatchmakingHandlers(io, socket);
    registerChessHandlers(io, socket);
    registerLudoHandlers(io, socket);

    // Cleanup on disconnect
    socket.on('disconnect', () => {
      if (socket.user && socket.user.sub) {
        const userId = socket.user.sub;
        if (userSockets.get(userId) === socket.id) {
          userSockets.delete(userId);
        }
        // Stop AI Transcription
        import('../services/ai/AIService.js').then(m => m.default.stopTranscription(userId));
      } else {
        // Fallback for non-authenticated users if they were using socket.id as userId
        import('../services/ai/AIService.js').then(m => m.default.stopTranscription(socket.id));
      }
      
      // Broadcast stats on disconnect
      broadcastStats();
    });
  });
}
