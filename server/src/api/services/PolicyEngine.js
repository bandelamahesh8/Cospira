/**
 * Policy Engine — Cospira Advanced Neural Controls
 *
 * Evaluates condition/action rules against room events.
 * Think of it as a firewall for rooms — rules auto-govern behavior.
 *
 * Rule format:
 *   condition: { field, operator, value }
 *   action:    string (e.g. 'enable_waiting_lobby', 'mute_user')
 *
 * AI suggestions are created via action: 'suggest_ai' — never enforced.
 */

import logger from '../../shared/logger.js';

// ─────────────────────────────────────────────
// SUPPORTED CONDITIONS
// ─────────────────────────────────────────────
export const CONDITION_FIELDS = {
  PARTICIPANTS:       'participants',
  USER_ROLE:          'user.role',
  USER_ACCOUNT_AGE:   'user.account_age_hours',
  TIME_ELAPSED:       'time_elapsed_minutes',
  ROOM_STATE:         'room.state',
  PARTICIPANT_COUNT:  'participants',
};

export const CONDITION_OPERATORS = {
  GT:  '>',
  LT:  '<',
  GTE: '>=',
  LTE: '<=',
  EQ:  '==',
  NEQ: '!=',
};

// ─────────────────────────────────────────────
// SUPPORTED ACTIONS
// ─────────────────────────────────────────────
export const POLICY_ACTIONS = {
  ENABLE_WAITING_LOBBY:   'enable_waiting_lobby',
  DISABLE_WAITING_LOBBY:  'disable_waiting_lobby',
  MUTE_USER:              'mute_user',
  MUTE_ALL:               'mute_all',
  UNMUTE_USER:            'unmute_user',
  PROMOTE_TO_SPEAKER:     'promote_to_speaker',
  DEMOTE_TO_LISTENER:     'demote_to_listener',
  PROMOTE_COHOST:         'auto_promote_cohost',
  LOCK_ROOM:              'lock_room',
  UNLOCK_ROOM:            'unlock_room',
  DISABLE_CHAT:           'disable_chat',
  ENABLE_CHAT:            'enable_chat',
  DISABLE_SCREEN_SHARE:   'disable_screen_share',
  ENABLE_SCREEN_SHARE:    'enable_screen_share',
  SEND_ALERT:             'send_alert',
  SUGGEST_AI:             'suggest_ai',   // advisory only, never auto-applied
};

// ─────────────────────────────────────────────
// POLICY ENGINE CLASS
// ─────────────────────────────────────────────
class PolicyEngine {
  constructor() {
    this.aiSuggestions = new Map(); // roomId → [suggestions]
  }

  // ─── Condition Evaluator ───────────────────

  /**
   * Evaluate a single condition against a context object.
   * @param {{ field, operator, value }} condition
   * @param {object} context  - { participants, user, room, time_elapsed_minutes }
   * @returns {boolean}
   */
  evaluate(condition, context) {
    if (!condition || !condition.field) return false;

    let actual;

    switch (condition.field) {
      case CONDITION_FIELDS.PARTICIPANTS:
        actual = context.participants ?? 0;
        break;
      case CONDITION_FIELDS.USER_ROLE:
        actual = context.user?.role ?? 'LISTENER';
        break;
      case CONDITION_FIELDS.USER_ACCOUNT_AGE:
        actual = context.user?.account_age_hours ?? 9999;
        break;
      case CONDITION_FIELDS.TIME_ELAPSED:
        actual = context.time_elapsed_minutes ?? 0;
        break;
      case CONDITION_FIELDS.ROOM_STATE:
        actual = context.room?.state ?? 'LIVE';
        break;
      default:
        logger.warn(`[PolicyEngine] Unknown condition field: ${condition.field}`);
        return false;
    }

    const target = condition.value;

    switch (condition.operator) {
      case '>':   return actual >   target;
      case '<':   return actual <   target;
      case '>=':  return actual >=  target;
      case '<=':  return actual <=  target;
      case '==':  return String(actual) === String(target);
      case '!=':  return String(actual) !== String(target);
      default:
        logger.warn(`[PolicyEngine] Unknown operator: ${condition.operator}`);
        return false;
    }
  }

  // ─── Full Policy Evaluation ───────────────

  /**
   * Evaluate all policies for a room against a given event.
   * Returns list of triggered policies and their resolved actions.
   * @param {object} room   - Room document (with policies array)
   * @param {object} event  - { type, userId, payload, ... }
   * @param {object} extra  - { participants, user, time_elapsed_minutes }
   * @returns {{ triggered: Array, deny: boolean, denyReason?: string }}
   */
  evaluatePolicies(room, event, extra = {}) {
    if (!room || !Array.isArray(room.policies) || room.policies.length === 0) {
      return { triggered: [], deny: false };
    }

    const context = {
      participants:          extra.participants ?? 0,
      user:                  extra.user ?? {},
      time_elapsed_minutes:  extra.time_elapsed_minutes ?? 0,
      room: {
        state: room.state ?? 'LIVE',
        id:    room.roomId,
      },
      event,
    };

    const triggered = [];
    let deny = false;
    let denyReason = null;

    // Sort by priority (lower number = higher priority)
    const sorted = [...room.policies]
      .filter(p => p.enabled !== false)
      .sort((a, b) => (a.priority ?? 50) - (b.priority ?? 50));

    for (const policy of sorted) {
      try {
        const matches = this.evaluate(policy.condition, context);
        if (matches) {
          triggered.push({ policy, context });

          // Check if action should block the triggering event
          if (this._isDenyingAction(policy.action, event.type)) {
            deny = true;
            denyReason = policy.name || `Policy [${policy.policyId}] denied the action.`;
          }
        }
      } catch (err) {
        logger.error(`[PolicyEngine] Error evaluating policy ${policy.policyId}: ${err.message}`);
      }
    }

    return { triggered, deny, denyReason };
  }

  /**
   * Execute the action of a given policy.
   * @param {string} action
   * @param {object} context   - { room, event, user, io, ... }
   * @param {Function} broadcast  - fn(roomId, event, data) to emit socket events
   * @returns {object} result
   */
  async executeAction(action, context, broadcast) {
    const { room, event, user, io } = context;
    const roomId = room?.roomId;

    logger.info(`[PolicyEngine] Executing action: ${action} for room ${roomId}`);

    switch (action) {
      case POLICY_ACTIONS.ENABLE_WAITING_LOBBY:
        room.settings.waiting_lobby = true;
        await room.save();
        broadcast?.(roomId, 'policy:action', { action, setting: 'waiting_lobby', value: true });
        return { ok: true, action };

      case POLICY_ACTIONS.DISABLE_WAITING_LOBBY:
        room.settings.waiting_lobby = false;
        await room.save();
        broadcast?.(roomId, 'policy:action', { action, setting: 'waiting_lobby', value: false });
        return { ok: true, action };

      case POLICY_ACTIONS.MUTE_USER:
        broadcast?.(roomId, 'policy:action', { action, userId: user?.id, reason: 'Policy enforcement' });
        return { ok: true, action };

      case POLICY_ACTIONS.MUTE_ALL:
        broadcast?.(roomId, 'policy:action', { action, reason: 'Policy enforcement' });
        return { ok: true, action };

      case POLICY_ACTIONS.LOCK_ROOM:
        room.state = 'LOCKED';
        await room.save();
        broadcast?.(roomId, 'room:state_changed', { state: 'LOCKED', triggeredBy: 'policy_engine' });
        return { ok: true, action };

      case POLICY_ACTIONS.UNLOCK_ROOM:
        room.state = 'LIVE';
        await room.save();
        broadcast?.(roomId, 'room:state_changed', { state: 'LIVE', triggeredBy: 'policy_engine' });
        return { ok: true, action };

      case POLICY_ACTIONS.DISABLE_CHAT:
        room.settings.chat_permission = 'none';
        await room.save();
        broadcast?.(roomId, 'policy:action', { action, setting: 'chat_permission', value: 'none' });
        return { ok: true, action };

      case POLICY_ACTIONS.ENABLE_CHAT:
        room.settings.chat_permission = 'everyone';
        await room.save();
        broadcast?.(roomId, 'policy:action', { action, setting: 'chat_permission', value: 'everyone' });
        return { ok: true, action };

      case POLICY_ACTIONS.DISABLE_SCREEN_SHARE:
        broadcast?.(roomId, 'policy:action', { action, reason: 'Policy enforcement' });
        return { ok: true, action };

      case POLICY_ACTIONS.SEND_ALERT:
        broadcast?.(roomId, 'policy:alert', { message: context.alertMessage || 'Policy alert triggered.' });
        return { ok: true, action };

      case POLICY_ACTIONS.SUGGEST_AI: {
        // AI suggestions — never auto-applied, host must approve
        const suggestion = {
          id:         `sug_${Date.now()}`,
          message:    context.suggestionMessage || 'Consider adjusting room settings.',
          action:     context.suggestedAction || null,
          roomId,
          timestamp:  new Date().toISOString(),
          approved:   false,
        };
        const existing = this.aiSuggestions.get(roomId) ?? [];
        existing.push(suggestion);
        // Keep last 20 suggestions
        if (existing.length > 20) existing.splice(0, existing.length - 20);
        this.aiSuggestions.set(roomId, existing);
        broadcast?.(roomId, 'ai:suggestion', suggestion);
        return { ok: true, action, suggestion };
      }

      default:
        logger.warn(`[PolicyEngine] Unknown action: ${action}`);
        return { ok: false, action, reason: 'Unknown action' };
    }
  }

  /**
   * Execute all triggered policies from an evaluatePolicies() result.
   * @param {Array} triggered   - Array of { policy, context }
   * @param {object} room       - Room document
   * @param {object} extra      - { user, io, broadcast }
   */
  async executeTriggered(triggered, room, extra = {}) {
    for (const { policy, context } of triggered) {
      await this.executeAction(policy.action, {
        room,
        event: context.event,
        user: context.user,
        io: extra.io,
        alertMessage: policy.alertMessage,
        suggestionMessage: policy.suggestionMessage,
        suggestedAction: policy.suggestedAction,
      }, extra.broadcast);
    }
  }

  // ─── AI Suggestions ───────────────────────

  /**
   * Get current AI suggestions for a room.
   * @param {string} roomId
   * @returns {Array}
   */
  getAISuggestions(roomId) {
    return this.aiSuggestions.get(roomId) ?? [];
  }

  /**
   * Clear AI suggestions for a room.
   * @param {string} roomId
   */
  clearAISuggestions(roomId) {
    this.aiSuggestions.delete(roomId);
  }

  /**
   * Generate contextual AI suggestions based on room metrics.
   * Called by Room Kernel periodically or on significant events.
   * @param {object} room
   * @param {object} metrics  - { participantCount, speakerDistribution, topics }
   * @param {Function} broadcast
   */
  async generateAISuggestions(room, metrics = {}, broadcast) {
    const suggestions = [];
    const { participantCount = 0, avgSpeakingTime = {} } = metrics;

    if (participantCount > 80) {
      suggestions.push({
        message: `${participantCount} participants detected. Consider enabling Host Mic Control.`,
        suggestedAction: POLICY_ACTIONS.ENABLE_WAITING_LOBBY,
      });
    }

    if (participantCount > 50 && room.state === 'LIVE') {
      suggestions.push({
        message: 'Large audience detected. Consider switching to Presentation mode.',
        suggestedAction: 'transition_state:PRESENTATION',
      });
    }

    // Dominant speaker detection
    const total = Object.values(avgSpeakingTime).reduce((a, b) => a + b, 0);
    for (const [uid, time] of Object.entries(avgSpeakingTime)) {
      if (total > 0 && time / total > 0.7) {
        suggestions.push({
          message: `One participant is speaking ${Math.round(time / total * 100)}% of the time. Consider enabling balanced discussion mode.`,
          suggestedAction: 'transition_state:DISCUSSION',
        });
        break;
      }
    }

    for (const s of suggestions) {
      await this.executeAction(POLICY_ACTIONS.SUGGEST_AI, {
        room,
        suggestionMessage: s.message,
        suggestedAction:   s.suggestedAction,
      }, broadcast);
    }

    return suggestions;
  }

  // ─── Helpers ──────────────────────────────

  /**
   * Determine if a policy action should deny the triggering event.
   * @param {string} action
   * @param {string} eventType
   * @returns {boolean}
   */
  _isDenyingAction(action, eventType) {
    const denyMap = {
      MIC_REQUEST:        [POLICY_ACTIONS.MUTE_USER, POLICY_ACTIONS.MUTE_ALL],
      SCREEN_SHARE_START: [POLICY_ACTIONS.DISABLE_SCREEN_SHARE],
      USER_JOIN:          [POLICY_ACTIONS.LOCK_ROOM],
    };
    return (denyMap[eventType] ?? []).includes(action);
  }

  /**
   * Dry-run policy evaluation — returns what would happen without executing.
   * Used by the UI Policy Builder for previewing rule effects.
   * @param {object} condition
   * @param {object} testContext
   * @returns {{ matches: boolean, context: object }}
   */
  dryRun(condition, testContext) {
    const matches = this.evaluate(condition, testContext);
    return { matches, context: testContext };
  }

  /**
   * Build a preconfigured Smart Room Mode policy set.
   * @param {'PRESENTATION'|'TOWNHALL'|'LECTURE'|'WORKSHOP'} modeName
   * @param {string} createdBy - userId
   * @returns {Array<object>} policy objects ready to insert into room.policies
   */
  buildSmartModePolicies(modeName, createdBy) {
    const now = new Date();
    const base = { createdBy, createdAt: now, enabled: true };

    const modes = {
      PRESENTATION: [
        { ...base, policyId: `p_${Date.now()}_1`, name: 'Mute listeners on presentation', priority: 1,
          condition: { field: 'user.role', operator: '==', value: 'LISTENER' },
          action: POLICY_ACTIONS.MUTE_USER },
        { ...base, policyId: `p_${Date.now()}_2`, name: 'Disable chat for listeners', priority: 2,
          condition: { field: 'user.role', operator: '==', value: 'LISTENER' },
          action: POLICY_ACTIONS.DISABLE_CHAT },
      ],
      TOWNHALL: [
        { ...base, policyId: `p_${Date.now()}_1`, name: 'Enable lobby when >50 users', priority: 1,
          condition: { field: 'participants', operator: '>', value: 50 },
          action: POLICY_ACTIONS.ENABLE_WAITING_LOBBY },
        { ...base, policyId: `p_${Date.now()}_2`, name: 'Disable screen share for non-hosts', priority: 2,
          condition: { field: 'user.role', operator: '==', value: 'LISTENER' },
          action: POLICY_ACTIONS.DISABLE_SCREEN_SHARE },
      ],
      LECTURE: [
        { ...base, policyId: `p_${Date.now()}_1`, name: 'Only speakers mic', priority: 1,
          condition: { field: 'user.role', operator: '!=', value: 'SPEAKER' },
          action: POLICY_ACTIONS.MUTE_USER },
      ],
      WORKSHOP: [
        { ...base, policyId: `p_${Date.now()}_1`, name: 'Auto-close after 90 min', priority: 10,
          condition: { field: 'time_elapsed_minutes', operator: '>', value: 90 },
          action: POLICY_ACTIONS.LOCK_ROOM },
      ],
    };

    return modes[modeName] ?? [];
  }
}

export default new PolicyEngine();
