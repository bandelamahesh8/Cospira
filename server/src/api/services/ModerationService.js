/**
 * Moderation Service - Phase 5
 * 
 * Central service for content moderation across chat and voice.
 * Manages violation logging, auto-actions, and host notifications.
 */

import { moderateContent, filterContent, checkAutoModeration, SEVERITY } from './ai/ContentModerator.js';
import { AIModerationLog } from '../models/AIModerationLog.js';
import roomService from './RoomService.js';
import logger from '../../shared/logger.js';

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

      // 4. Advisory suggestion (AI never auto-acts — suggestion goes to host/owner)
      const suggestedAction = autoMod.shouldModerate ? autoMod.action : result.action;
      const reason = autoMod.shouldModerate ? autoMod.reason : 'Automated content policy violation';

      // Emit advisory — human decides
      await this.emitModerationSuggestion(roomId, userId, userName, suggestedAction, reason, result.severity);

      // 5. Filter content (text redaction is still automatic — not a human action)
      const filteredContent = (result.severity === SEVERITY.HIGH || result.severity === SEVERITY.CRITICAL)
        ? `[Content removed for policy violation]`
        : filterContent(content, result);

      return { 
        content: filteredContent, 
        result,
        blocked: (result.severity === SEVERITY.HIGH || result.severity === SEVERITY.CRITICAL),
        suggestion: { action: suggestedAction, reason },
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
   * Emit moderation SUGGESTION to host/owner.
   * AI is advisory — the human decides whether to act.
   * @param {string} suggestedAction - 'kick' | 'mute_temporary' | 'warn'
   */
  async emitModerationSuggestion(roomId, userId, userName, suggestedAction, reason, severity) {
    if (!this.io) return;

    logger.info(`[ModerationService] Advisory: suggest '${suggestedAction}' for ${userName} (${userId}) in ${roomId}`);

    // Save to AI Memory (unchanged)
    try {
      const { default: aiMemoryService } = await import('./ai/AIMemoryService.js');
      await aiMemoryService.saveMemory({
        roomId,
        userId,
        eventType: 'moderation_suggestion',
        content: {
          suggestedAction,
          reason,
          targetUser: userName,
          message: `AI Suggestion: consider '${suggestedAction}' for ${userName} — ${reason}`,
        },
        importance: suggestedAction === 'kick' ? 5 : 3,
        tags: ['moderation', 'suggestion', suggestedAction],
      });
    } catch (e) {
      logger.error('[ModerationService] Failed to log memory:', e.message);
    }

    // Advisory emission to host/room (no auto-action)
    this.io.to(roomId).emit('ai:moderation:suggestion', {
      userId,
      userName,
      suggestedAction,
      reason,
      severity,
      // Actions the host can trigger via normal UI flows
      available_actions: suggestedAction === 'kick'
        ? ['Mute', 'Remove from breakout', 'Dismiss']
        : ['Warn', 'Mute', 'Dismiss'],
    });
  }

  /**
   * @deprecated Auto-action removed — AI is advisory only.
   * Kept for backward compatibility with any direct callers.
   * Will emit suggestion instead of executing action.
   */
  async executeAction(roomId, userId, userName, action, reason, duration = 0) {
    logger.warn('[ModerationService] executeAction() is deprecated — use emitModerationSuggestion() instead');
    await this.emitModerationSuggestion(roomId, userId, userName, action, reason, 'medium');
  }
}

export default new ModerationService();
