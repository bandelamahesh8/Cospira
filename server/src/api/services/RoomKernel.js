/**
 * Room Kernel — Cospira Advanced Neural Controls
 *
 * The central event pipeline. Every room action flows through this kernel:
 *
 *   Event Ingress
 *     → Policy Engine  (condition/action rules)
 *     → Authority Engine  (role-based access)
 *     → State Engine  (state-based constraints)
 *     → Action Executor  (perform the action)
 *     → Event Broadcast  (notify all clients)
 *
 * Nothing bypasses the kernel.
 */

import logger from '../../shared/logger.js';
import policyEngine   from './PolicyEngine.js';
import authorityEngine from './AuthorityEngine.js';
import stateMachine   from './RoomStateMachine.js';
import { Room }       from '../models/Room.js';

// ─────────────────────────────────────────────
// EVENT TYPES
// ─────────────────────────────────────────────
export const KERNEL_EVENTS = {
  USER_JOIN:          'USER_JOIN',
  USER_LEAVE:         'USER_LEAVE',
  MIC_REQUEST:        'MIC_REQUEST',
  MIC_DENY:           'MIC_DENY',
  SCREEN_SHARE_START: 'SCREEN_SHARE_START',
  SCREEN_SHARE_STOP:  'SCREEN_SHARE_STOP',
  CHAT_MESSAGE:       'CHAT_MESSAGE',
  ROLE_CHANGE:        'ROLE_CHANGE',
  STATE_CHANGE:       'STATE_CHANGE',
  FILE_SHARED:        'FILE_SHARED',
  KICK_USER:          'KICK_USER',
  RECORDING_START:    'RECORDING_START',
  RECORDING_STOP:     'RECORDING_STOP',
  POLICY_CREATE:      'POLICY_CREATE',
  POLICY_DELETE:      'POLICY_DELETE',
};

// ─────────────────────────────────────────────
// ROOM KERNEL CLASS
// ─────────────────────────────────────────────
class RoomKernel {
  constructor() {
    this.eventLog = new Map(); // roomId → recent events (for audit/analytics)
    this.roomMetrics = new Map(); // roomId → { participantCount, speakingTimers, ... }
  }

  // ─── Core Pipeline ────────────────────────

  /**
   * Process a room event through the full kernel pipeline.
   *
   * @param {object} io          - Socket.io server instance
   * @param {object} event       - { type, roomId, userId, payload }
   * @param {object} userContext - { user: { id, role, account_age_hours }, participants }
   * @returns {Promise<{ allowed: boolean, result?: any, reason?: string }>}
   */
  async processEvent(io, event, userContext = {}) {
    const { type, roomId, userId, payload = {} } = event;

    if (!type || !roomId) {
      return { allowed: false, reason: 'Invalid event: missing type or roomId.' };
    }

    // ── Load Room ────────────────────────────
    let room;
    try {
      room = await Room.findByRoomId(roomId);
    } catch (err) {
      logger.error(`[Kernel] Failed to load room ${roomId}: ${err.message}`);
      return { allowed: false, reason: 'Room load error.' };
    }

    if (!room) {
      return { allowed: false, reason: 'Room not found.' };
    }

    // Build broadcast helper
    const broadcast = (rid, evtName, data) => {
      if (io) io.to(rid).emit(evtName, data);
    };

    const metrics = this.roomMetrics.get(roomId) ?? { participantCount: userContext.participants ?? 0 };

    // ── STEP 1: Policy Engine ─────────────────
    const policyResult = policyEngine.evaluatePolicies(room, event, {
      participants:         metrics.participantCount,
      user:                 userContext.user ?? { id: userId },
      time_elapsed_minutes: this._getTimeElapsed(roomId),
    });

    if (policyResult.deny) {
      logger.info(`[Kernel] Policy denied ${type} for ${userId} in ${roomId}: ${policyResult.denyReason}`);
      broadcast(roomId, 'event:denied', { type, userId, reason: policyResult.denyReason, source: 'policy' });
      // Still execute non-denying triggered policies (e.g. send alerts, AI suggestions)
      const nonDenyingTriggered = policyResult.triggered.filter(
        ({ policy }) => !policyEngine._isDenyingAction(policy.action, type)
      );
      await policyEngine.executeTriggered(nonDenyingTriggered, room, { io, broadcast });
      return { allowed: false, reason: policyResult.denyReason, source: 'policy' };
    }

    // Execute all triggered non-denying policies (side effects)
    if (policyResult.triggered.length > 0) {
      await policyEngine.executeTriggered(policyResult.triggered, room, { io, broadcast });
      broadcast(roomId, 'policy:triggered', {
        policies: policyResult.triggered.map(t => ({
          name:   t.policy.name,
          action: t.policy.action,
        })),
      });
    }

    // ── STEP 2: Authority Engine ──────────────
    const authResult = authorityEngine.canPerformAction(room, userId, type);

    if (!authResult.allowed) {
      logger.info(`[Kernel] Authority denied ${type} for ${userId} (${authResult.role}) in ${roomId}`);
      broadcast(roomId, 'event:denied', { type, userId, reason: authResult.reason, source: 'authority' });
      return { allowed: false, reason: authResult.reason, source: 'authority' };
    }

    // ── STEP 3: State Engine ──────────────────
    const stateResult = stateMachine.isActionAllowed(room.state || 'LIVE', type, authResult.role);

    if (!stateResult.allowed) {
      logger.info(`[Kernel] State (${room.state}) denied ${type} for ${userId} in ${roomId}`);
      broadcast(roomId, 'event:denied', { type, userId, reason: stateResult.reason, source: 'state' });
      return { allowed: false, reason: stateResult.reason, source: 'state' };
    }

    // Special lobby state — don't deny, but signal
    if (stateResult.status === 'LOBBY') {
      broadcast(roomId, 'event:lobby', { type, userId });
      return { allowed: true, status: 'LOBBY', reason: stateResult.reason };
    }

    // ── STEP 4: Action Executor ───────────────
    try {
      const result = await this._executeAction(io, room, event, authResult, broadcast);

      // ── STEP 5: Broadcast Execution ──────────
      broadcast(roomId, 'event:executed', { type, userId, payload, role: authResult.role });

      // Audit log
      this._logEvent(roomId, { type, userId, payload, role: authResult.role, at: new Date() });

      // Periodic AI suggestions
      this._maybeGenerateAISuggestions(room, metrics, broadcast);

      return { allowed: true, result };
    } catch (err) {
      logger.error(`[Kernel] Action execution failed for ${type} in ${roomId}: ${err.message}`);
      return { allowed: false, reason: 'Action execution error.' };
    }
  }

  // ─── Action Executor ──────────────────────

  /**
   * Execute the validated action.
   * @private
   */
  async _executeAction(io, room, event, authResult, broadcast) {
    const { type, roomId, userId, payload } = event;

    switch (type) {
      case KERNEL_EVENTS.USER_JOIN: {
        this._incrementParticipants(roomId);
        return { joined: true };
      }

      case KERNEL_EVENTS.USER_LEAVE: {
        this._decrementParticipants(roomId);
        // Auto-promote if host left
        const promotionResult = await authorityEngine.autoPromoteOnHostLeave(room, userId, broadcast);
        return { left: true, promoted: promotionResult.promoted, newHostId: promotionResult.newHostId };
      }

      case KERNEL_EVENTS.MIC_REQUEST: {
        broadcast(roomId, 'mic:granted', { userId, grantedBy: 'kernel' });
        return { micGranted: true };
      }

      case KERNEL_EVENTS.SCREEN_SHARE_START: {
        broadcast(roomId, 'screen_share:started', { userId });
        return { screenShareStarted: true };
      }

      case KERNEL_EVENTS.STATE_CHANGE: {
        const newState = payload.newState;
        const transResult = await stateMachine.transition(room, newState, userId);
        if (transResult.success) {
          broadcast(roomId, 'room:state_changed', {
            state:         transResult.state,
            previousState: transResult.previousState,
            preset:        transResult.preset,
            triggeredBy:   userId,
          });
        }
        return transResult;
      }

      case KERNEL_EVENTS.ROLE_CHANGE: {
        const { targetUserId, newRole } = payload;
        await authorityEngine.grantRole(room, targetUserId, newRole, userId);
        broadcast(roomId, 'authority:role_granted', { userId: targetUserId, newRole, grantedBy: userId });
        return { roleChanged: true, targetUserId, newRole };
      }

      case KERNEL_EVENTS.KICK_USER: {
        const { targetUserId } = payload;
        broadcast(roomId, 'user:kicked', { userId: targetUserId, kickedBy: userId });
        return { kicked: true, targetUserId };
      }

      case KERNEL_EVENTS.POLICY_CREATE: {
        const newPolicy = payload.policy;
        if (!Array.isArray(room.policies)) room.policies = [];
        room.policies.push({ ...newPolicy, createdBy: userId, createdAt: new Date(), enabled: true });
        await room.save();
        broadcast(roomId, 'policy:created', { policy: newPolicy });
        return { policyCreated: true };
      }

      case KERNEL_EVENTS.POLICY_DELETE: {
        const { policyId } = payload;
        if (Array.isArray(room.policies)) {
          room.policies = room.policies.filter(p => p.policyId !== policyId);
          await room.save();
        }
        broadcast(roomId, 'policy:deleted', { policyId });
        return { policyDeleted: true };
      }

      default:
        return { executed: true };
    }
  }

  // ─── Metrics Tracking ─────────────────────

  _incrementParticipants(roomId) {
    const m = this.roomMetrics.get(roomId) ?? { participantCount: 0, startedAt: new Date() };
    m.participantCount = (m.participantCount || 0) + 1;
    this.roomMetrics.set(roomId, m);
  }

  _decrementParticipants(roomId) {
    const m = this.roomMetrics.get(roomId) ?? { participantCount: 0 };
    m.participantCount = Math.max(0, (m.participantCount || 1) - 1);
    this.roomMetrics.set(roomId, m);
  }

  _getTimeElapsed(roomId) {
    const m = this.roomMetrics.get(roomId);
    if (!m || !m.startedAt) return 0;
    return Math.floor((Date.now() - m.startedAt.getTime()) / 60000);
  }

  /**
   * Get live metrics for a room.
   * @param {string} roomId
   * @returns {object}
   */
  getRoomMetrics(roomId) {
    return this.roomMetrics.get(roomId) ?? { participantCount: 0 };
  }

  /**
   * Reset metrics when room ends.
   * @param {string} roomId
   */
  clearRoom(roomId) {
    this.roomMetrics.delete(roomId);
    this.eventLog.delete(roomId);
  }

  // ─── Audit Log ────────────────────────────

  _logEvent(roomId, entry) {
    const log = this.eventLog.get(roomId) ?? [];
    log.push(entry);
    if (log.length > 200) log.splice(0, log.length - 200); // keep last 200
    this.eventLog.set(roomId, log);
  }

  /**
   * Get the recent event log for a room.
   * @param {string} roomId
   * @param {number} limit
   * @returns {Array}
   */
  getEventLog(roomId, limit = 50) {
    const log = this.eventLog.get(roomId) ?? [];
    return log.slice(-limit);
  }

  // ─── AI Governance ────────────────────────

  async _maybeGenerateAISuggestions(room, metrics, broadcast) {
    // Generate suggestions on a throttled basis — at most every 5 minutes
    const roomId = room.roomId;
    const m = this.roomMetrics.get(roomId) ?? {};
    const lastSuggestion = m.lastAISuggestion ?? 0;
    if (Date.now() - lastSuggestion < 5 * 60 * 1000) return;

    m.lastAISuggestion = Date.now();
    this.roomMetrics.set(roomId, m);

    try {
      await policyEngine.generateAISuggestions(room, metrics, broadcast);
    } catch (err) {
      logger.debug(`[Kernel] AI suggestion generation skipped: ${err.message}`);
    }
  }
}

export default new RoomKernel();
