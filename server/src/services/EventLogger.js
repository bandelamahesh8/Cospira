import { RoomEvent } from '../models/RoomEvent.js';
import { WebRTCMetrics } from '../models/WebRTCMetrics.js';
import { VoiceTranscript } from '../models/VoiceTranscript.js';
import { AIModerationLog } from '../models/AIModerationLog.js';
import { RoomAnalytics } from '../models/RoomAnalytics.js';
import logger from '../logger.js';

class EventLogger {
  
  // 1. Room Events (Join/Leave/Mute/Share)
  async logRoomEvent(roomId, userId, eventType, metadata = {}) {
    try {
      if (!roomId || !userId) return;
      await RoomEvent.create({
        roomId,
        userId,
        eventType,
        metadata,
        timestamp: new Date()
      });
      logger.debug(`[EventLogger] ${eventType} logged for ${userId} in ${roomId}`);
    } catch (err) {
        // Non-blocking error logging
       logger.error('[EventLogger] Failed to log room event:', err);
    }
  }

  // 2. WebRTC Metrics (Time-series)
  async logWebRTCMetrics(data) {
      try {
          const { roomId, userId, metrics } = data;
          if (!roomId || !userId || !metrics) return;
          
          await WebRTCMetrics.create({
              roomId,
              userId,
              ...metrics,
              timestamp: new Date()
          });
      } catch (err) {
         // Silently fail for metrics to reduce noise, or log debug
         logger.debug('[EventLogger] Metric log failed:', err.message);
      }
  }

  // 3. Voice Transcripts (For saving history/accessibility)
  async logTranscript(data) {
      try {
        await VoiceTranscript.create({
            ...data,
            createdAt: new Date()
        });
      } catch (err) {
          logger.error('[EventLogger] Transcript log failed:', err);
      }
  }

  // 4. AI Moderation
  async logModeration(data) {
      try {
          await AIModerationLog.create({
              ...data,
              timestamp: new Date()
          });
      } catch (err) {
          logger.error('[EventLogger] Moderation log failed:', err);
      }
  }

  // 5. Analytics (Session end)
  async logSessionAnalytics(data) {
      try {
          await RoomAnalytics.create({
              ...data,
              createdAt: new Date()
          });
      } catch (err) {
          logger.error('[EventLogger] Analytics log failed:', err);
      }
  }

  // Helper methods for specific event types
  
  // Connection events
  async logUserJoin(roomId, userId, metadata = {}) {
    return this.logRoomEvent(roomId, userId, 'join', metadata);
  }

  async logUserLeave(roomId, userId, metadata = {}) {
    return this.logRoomEvent(roomId, userId, 'leave', metadata);
  }

  // Media events
  async logMute(roomId, userId, metadata = {}) {
    return this.logRoomEvent(roomId, userId, 'mute', metadata);
  }

  async logUnmute(roomId, userId, metadata = {}) {
    return this.logRoomEvent(roomId, userId, 'unmute', metadata);
  }

  async logShareStart(roomId, userId, metadata = {}) {
    return this.logRoomEvent(roomId, userId, 'share', metadata);
  }

  async logShareStop(roomId, userId, metadata = {}) {
    return this.logRoomEvent(roomId, userId, 'stop_share', metadata);
  }

  async logSpeak(roomId, userId, duration, metadata = {}) {
    return this.logRoomEvent(roomId, userId, 'speak', { duration, ...metadata });
  }

  // Communication events
  async logChat(roomId, userId, message, metadata = {}) {
    return this.logRoomEvent(roomId, userId, 'chat', { message, ...metadata });
  }

  async logReaction(roomId, userId, reaction, metadata = {}) {
    return this.logRoomEvent(roomId, userId, 'react', { reaction, ...metadata });
  }

  // Action events
  async logActionCreated(roomId, userId, actionId, actionText, owner) {
    return this.logRoomEvent(roomId, userId, 'action_created', {
      actionId,
      actionText,
      owner,
      status: 'pending'
    });
  }

  async logActionUpdated(roomId, userId, actionId, previousStatus, newStatus) {
    return this.logRoomEvent(roomId, userId, 'action_updated', {
      actionId,
      previousStatus,
      newStatus
    });
  }

  async logActionCompleted(roomId, userId, actionId) {
    return this.logRoomEvent(roomId, userId, 'action_completed', {
      actionId,
      completedAt: new Date()
    });
  }

  // Decision events
  async logDecisionMade(roomId, userId, decisionId, decisionText) {
    return this.logRoomEvent(roomId, userId, 'decision_made', {
      decisionId,
      decisionText,
      status: 'proposed'
    });
  }

  async logDecisionUpdated(roomId, userId, decisionId, previousStatus, newStatus) {
    return this.logRoomEvent(roomId, userId, 'decision_updated', {
      decisionId,
      previousStatus,
      newStatus
    });
  }

  // Poll events
  async logPollCreated(roomId, userId, pollId, question, options) {
    return this.logRoomEvent(roomId, userId, 'poll_created', {
      pollId,
      question,
      options
    });
  }

  async logPollVoted(roomId, userId, pollId, vote) {
    return this.logRoomEvent(roomId, userId, 'poll_voted', { pollId, vote });
  }

  async logPollClosed(roomId, userId, pollId, results) {
    return this.logRoomEvent(roomId, userId, 'poll_closed', { pollId, results });
  }

  // Moderation events
  async logRoomLocked(roomId, userId) {
    return this.logRoomEvent(roomId, userId, 'room_locked', { lockedAt: new Date() });
  }

  async logRoomUnlocked(roomId, userId) {
    return this.logRoomEvent(roomId, userId, 'room_unlocked', { unlockedAt: new Date() });
  }

  async logUserKicked(roomId, kickedBy, kickedUserId, reason) {
    return this.logRoomEvent(roomId, kickedBy, 'user_kicked', {
      kickedUserId,
      reason,
      kickedAt: new Date()
    });
  }

  async logUserPromoted(roomId, promotedBy, promotedUserId, previousRole, newRole) {
    return this.logRoomEvent(roomId, promotedBy, 'user_promoted', {
      promotedUserId,
      previousRole,
      newRole
    });
  }

  async logSettingsChanged(roomId, userId, changedSettings) {
    return this.logRoomEvent(roomId, userId, 'settings_changed', {
      changes: changedSettings,
      changedAt: new Date()
    });
  }

  // Query methods
  async getRecentRoomEvents(roomId, limit = 50) {
    try {
      return await RoomEvent.find({ roomId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean();
    } catch (error) {
      logger.error('[EventLogger] Failed to get recent events', { roomId, error: error.message });
      return [];
    }
  }

  async getRoomEventsByType(roomId, eventType, limit = 50) {
    try {
      return await RoomEvent.find({ roomId, eventType })
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean();
    } catch (error) {
      logger.error('[EventLogger] Failed to get events by type', { roomId, eventType, error: error.message });
      return [];
    }
  }

  async getRoomEventsInRange(roomId, startTime, endTime) {
    try {
      return await RoomEvent.find({
        roomId,
        timestamp: { $gte: startTime, $lte: endTime }
      })
        .sort({ timestamp: 1 })
        .lean();
    } catch (error) {
      logger.error('[EventLogger] Failed to get events in range', { roomId, error: error.message });
      return [];
    }
  }

  async getUserRoomActivity(roomId, userId, limit = 50) {
    try {
      return await RoomEvent.find({ roomId, userId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean();
    } catch (error) {
      logger.error('[EventLogger] Failed to get user activity', { roomId, userId, error: error.message });
      return [];
    }
  }
}

export default new EventLogger();
