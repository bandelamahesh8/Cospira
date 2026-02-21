/**
 * Moderation Service - Phase 5
 * 
 * Central service for content moderation across chat and voice.
 * Manages violation logging, auto-actions, and host notifications.
 */

import { moderateContent, filterContent, checkAutoModeration, SEVERITY } from './ai/ContentModerator.js';
import { AIModerationLog } from '../models/AIModerationLog.js';
import roomService from './RoomService.js';
import logger from '../logger.js';

class ModerationService {
  constructor() {
    this.io = null;
  }

  init(io) {
    this.io = io;
  }

  /**
   * Handle content moderation (Chat or Voice)
   * @param {Object} params - Moderation parameters
   * @returns {Promise<Object>} Final processed content and moderation info
   */
  async handleModeration({ roomId, userId, userName, contentType, content }) {
    try {
      // 1. Moderate content
      const result = moderateContent(content, { roomId, userId, contentType });

      if (result.safe) {
        return { content, result };
      }

      // 2. Log violation
      const log = new AIModerationLog({
        roomId,
        userId,
        userName,
        contentType,
        content: content.substring(0, 500), // Privacy: Truncate stored content
        severity: result.severity,
        violations: result.violations,
        actionTaken: result.action
      });
      await log.save();

      // 3. Fetch user history for auto-moderation decisions
      const history = await AIModerationLog.find({ 
        userId, 
        timestamp: { $gt: new Date(Date.now() - 60 * 60 * 1000) } 
      });

      const autoMod = checkAutoModeration(history);
      
      // 4. Execute Actions
      const finalAction = autoMod.shouldModerate ? autoMod.action : result.action;
      const reason = autoMod.shouldModerate ? autoMod.reason : 'Automated content policy violation';

      await this.executeAction(roomId, userId, userName, finalAction, reason, autoMod.duration);

      // 5. Filter content if not blocked
      const filteredContent = (result.severity === SEVERITY.HIGH || result.severity === SEVERITY.CRITICAL)
        ? `[Content blocked for ${result.violations[0]?.type}]`
        : filterContent(content, result);

      return { 
        content: filteredContent, 
        result, 
        blocked: (result.severity === SEVERITY.HIGH || result.severity === SEVERITY.CRITICAL)
      };

    } catch (error) {
      logger.error('[ModerationService] Moderation failed:', error.message);
      return { content, result: { safe: true } }; // Fail-open for safety
    }
  }

  /**
   * Check for suspicious bot activity
   * @param {string} roomId - Room ID
   * @param {string} userId - User ID
   * @param {string} activityType - Type of activity (join, chat, etc)
   * @returns {Promise<Object>} Anomaly detection result
   */
  async checkBotActivity(roomId, userId, activityType) {
    try {
      const { RoomEvent } = await import('../models/RoomEvent.js');
      const windowMs = 30000; // 30 seconds
      const now = new Date();
      const startTime = new Date(now.getTime() - windowMs);

      const recentEvents = await RoomEvent.countDocuments({
        userId,
        eventType: activityType,
        timestamp: { $gte: startTime }
      });

      // Thresholds
      const thresholds = {
        join: 5,   // 5 joins in 30s
        chat: 20,  // 20 messages in 30s
        react: 30  // 30 reactions in 30s
      };

      const limit = thresholds[activityType] || 50;

      if (recentEvents > limit) {
        logger.warn(`[BotDetection] Suspicious ${activityType} activity for user ${userId}: ${recentEvents} events`);
        
        // Take auto-action if it's extreme
        if (recentEvents > limit * 2) {
            await this.executeAction(roomId, userId, 'System', 'kick', 'Automated bot detection: Excessive activity');
            return { bot: true, severity: 'critical', action: 'kick' };
        }

        return { bot: true, severity: 'warning', action: 'warn' };
      }

      return { bot: false };
    } catch (error) {
      return { bot: false };
    }
  }

  /**
   * Execute moderation action (Mute, Kick, Warn)
   */
  async executeAction(roomId, userId, userName, action, reason, duration = 0) {
    if (!this.io) return;

    logger.warn(`[Moderation] Executing ${action} on ${userName} (${userId}) in ${roomId}. Reason: ${reason}`);

    // Save to AI Memory
    try {
        const { default: aiMemoryService } = await import('./ai/AIMemoryService.js');
        await aiMemoryService.saveMemory({
            roomId,
            userId,
            eventType: 'decision',
            content: { 
                action, 
                reason, 
                targetUser: userName,
                message: `AI Decision: ${action.toUpperCase()} user ${userName} for "${reason}"`
            },
            importance: action === 'kick' ? 5 : 3,
            tags: ['moderation', 'decision', action]
        });
    } catch (e) {
        logger.error('[ModerationService] Failed to log memory:', e.message);
    }

    // Notify the user specifically
    this.io.to(userId).emit('moderation:action', {
      action,
      reason,
      duration,
      timestamp: new Date()
    });

    // Notify the room/host
    this.io.to(roomId).emit('moderation:alert', {
      userId,
      userName,
      action,
      reason,
      severity: action === 'kick' ? 'critical' : 'high'
    });

    // Logical execution
    switch (action) {
      case 'kick':
        // We'll need to find the socket associated with this user
        // and disconnect them from the room.
        // For now, emit a 'force-leave' event the client must respect.
        this.io.to(userId).emit('room:force-leave', { reason });
        break;
      
      case 'mute_extended':
      case 'mute_temporary':
        // Emit global mute for this user
        this.io.to(roomId).emit('room:member-muted', {
          userId,
          reason,
          duration,
          automated: true
        });
        break;
      
      case 'warn':
        // Warn is just the notification already sent
        break;
    }
  }
}

export default new ModerationService();
