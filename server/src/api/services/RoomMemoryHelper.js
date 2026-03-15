/**
 * Room Memory Helper
 * 
 * Automatically sends room memory (last summary, pending actions)
 * when users join a room.
 * 
 * Phase 2: Room Memory
 */

import roomTimelineService from '../services/RoomTimelineService.js';
import meetingSummarizerService from '../services/MeetingSummarizerService.js';
import roomService from '../services/RoomService.js';
import logger from '../../shared/logger.js';

class RoomMemoryHelper {
  /**
   * Send room memory to user on join
   * @param {object} socket - Socket instance
   * @param {string} roomId - Room ID
   * @param {string} userId - User ID
   */
  async sendRoomMemoryOnJoin(socket, roomId, userId) {
    try {
      // Get active session to check if late join
      const activeSession = await roomService.getActiveSession(roomId);
      
      // Send last session summary (if exists)
      await this.sendLastSessionSummary(socket, roomId);
      
      // Send pending items reminder
      await this.sendPendingItemsReminder(socket, roomId, userId);
      
      // Check for late join and send quick summary
      if (activeSession) {
        await this.checkAndSendLateJoinSummary(socket, roomId, activeSession);
      }
      
      logger.info(`[RoomMemory] Room memory sent to ${userId} in ${roomId}`);
    } catch (error) {
      logger.error('[RoomMemory] Failed to send room memory', {
        roomId,
        userId,
        error: error.message
      });
    }
  }

  /**
   * Send last session summary
   * @param {object} socket - Socket instance
   * @param {string} roomId - Room ID
   */
  async sendLastSessionSummary(socket, roomId) {
    try {
      const lastSummary = await roomTimelineService.getLastSessionSummary(roomId);
      
      if (lastSummary) {
        socket.emit('room:last-session-summary', {
          sessionId: lastSummary.sessionId,
          endedAt: lastSummary.endedAt,
          duration: lastSummary.duration,
          participantCount: lastSummary.participantCount,
          bullets: lastSummary.summary.bullets,
          actionItemsCount: lastSummary.summary.actionItems.length,
          decisionsCount: lastSummary.summary.decisions.length
        });
        
        logger.debug(`[RoomMemory] Last session summary sent for ${roomId}`);
      }
    } catch (error) {
      logger.error('[RoomMemory] Failed to send last session summary', {
        roomId,
        error: error.message
      });
    }
  }

  /**
   * Send pending items reminder
   * @param {object} socket - Socket instance
   * @param {string} roomId - Room ID
   * @param {string} userId - User ID
   */
  async sendPendingItemsReminder(socket, roomId, userId) {
    try {
      const pendingItems = await roomTimelineService.getUserPendingItems(roomId, userId);
      
      if (pendingItems.totalPending > 0) {
        socket.emit('room:pending-actions-reminder', {
          count: pendingItems.totalPending,
          actionsCount: pendingItems.actionsCount,
          decisionsCount: pendingItems.decisionsCount,
          actions: pendingItems.actions.slice(0, 3), // Top 3 only
          decisions: pendingItems.decisions.slice(0, 3) // Top 3 only
        });
        
        logger.debug(`[RoomMemory] Pending items reminder sent: ${pendingItems.totalPending} items`);
      }
    } catch (error) {
      logger.error('[RoomMemory] Failed to send pending items', {
        roomId,
        userId,
        error: error.message
      });
    }
  }

  /**
   * Check for late join and send quick summary
   * @param {object} socket - Socket instance
   * @param {string} roomId - Room ID
   * @param {object} session - Active session
   */
  async checkAndSendLateJoinSummary(socket, roomId, session) {
    try {
      // Calculate session duration in minutes
      const durationMinutes = (Date.now() - new Date(session.startedAt).getTime()) / 60000;
      
      // Late join threshold: 5 minutes
      const LATE_JOIN_THRESHOLD = 5;
      
      if (durationMinutes > LATE_JOIN_THRESHOLD) {
        // Generate quick summary for last N minutes (max 15)
        const summaryMinutes = Math.min(durationMinutes, 15);
        
        const quickSummary = await meetingSummarizerService.generateQuickSummary(
          roomId,
          summaryMinutes
        );
        
        socket.emit('room:late-join-summary', {
          isLateJoin: true,
          sessionDuration: Math.round(durationMinutes),
          summaryDuration: summaryMinutes,
          summary: quickSummary.summary,
          bullets: quickSummary.bullets,
          transcriptCount: quickSummary.transcriptCount
        });
        
        logger.info(`[RoomMemory] Late join summary sent (${durationMinutes.toFixed(1)} min session)`);
      }
    } catch (error) {
      logger.error('[RoomMemory] Failed to send late join summary', {
        roomId,
        error: error.message
      });
    }
  }

  /**
   * Send room statistics
   * @param {object} socket - Socket instance
   * @param {string} roomId - Room ID
   */
  async sendRoomStats(socket, roomId) {
    try {
      const stats = await roomTimelineService.getRoomStats(roomId);
      
      socket.emit('room:stats', stats);
      
      logger.debug(`[RoomMemory] Room stats sent for ${roomId}`);
    } catch (error) {
      logger.error('[RoomMemory] Failed to send room stats', {
        roomId,
        error: error.message
      });
    }
  }
}

export default new RoomMemoryHelper();
