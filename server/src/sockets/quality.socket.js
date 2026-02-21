/**
 * Quality & Trust Socket Handlers - Phase 4
 * 
 * Handles presence tracking and media quality reporting.
 */

import roomService from '../services/RoomService.js';
import eventLogger from '../services/EventLogger.js';
import logger from '../logger.js';

export default function registerQualityHandlers(io, socket) {
  
  /**
   * Update user presence status (active, idle, away)
   */
  socket.on('user:update-status', async ({ roomId, status }, callback) => {
    try {
      const userId = socket.user?.id;
      if (!userId) return callback?.({ success: false, error: 'Auth required' });

      // Update in MongoDB
      const room = await roomService.getRoom(roomId);
      if (room) {
        room.updateMemberStatus(userId, status);
        await room.save();
      }

      // Broadcast to room
      io.to(roomId).emit('user:status-updated', {
        userId,
        status,
        timestamp: new Date()
      });

      // Log event
      eventLogger.logRoomEvent(roomId, userId, 'presence_change', { status });

      callback?.({ success: true });
    } catch (error) {
      logger.error('[Quality] status-update failed:', error.message);
      callback?.({ success: false, error: error.message });
    }
  });

  /**
   * Report WebRTC media quality metrics
   */
  socket.on('media:quality-report', async ({ roomId, metrics }, callback) => {
    try {
      const userId = socket.user?.id;
      if (!userId) return;

      const { 
        packetLoss = 0, 
        latency = 0, 
        jitter = 0, 
        resolution = '', 
        frameRate = 0 
      } = metrics;

      // Log the quality metric
      eventLogger.logWebRTCMetrics({
        roomId,
        userId,
        metrics: {
          packetLoss,
          latency,
          jitter,
          resolution,
          frameRate
        }
      });

      // If quality is critically low, alert the room (optional/throttled)
      if (packetLoss > 15 || latency > 500) {
        // Broadcasst a "Stability Alert" to others
        socket.to(roomId).emit('user:connection-warning', {
          userId,
          userName: socket.user?.name || 'User',
          severity: packetLoss > 25 ? 'critical' : 'poor',
          reason: packetLoss > 15 ? 'High packet loss' : 'High latency'
        });
      }

      callback?.({ success: true });
    } catch (error) {
      // Silent error for metrics to prefer performance
      callback?.({ success: false });
    }
  });
}
