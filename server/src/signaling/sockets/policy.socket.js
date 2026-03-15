/**
 * Policy Socket Handler — Cospira Advanced Neural Controls
 *
 * Handles all policy engine socket events:
 *   - CRUD for room policies
 *   - Dry-run evaluation
 *   - Smart mode presets
 *   - Room state transitions
 *   - Authority role management
 *   - Command network controls
 */

import logger from '../../shared/logger.js';
import { Room } from '../../api/models/Room.js';
import policyEngine    from '../../api/services/PolicyEngine.js';
import authorityEngine from '../../api/services/AuthorityEngine.js';
import stateMachine    from '../../api/services/RoomStateMachine.js';
import roomKernel      from '../../api/services/RoomKernel.js';
import commandNetwork  from '../../api/services/CommandNetwork.js';
import { v4 as uuidv4 } from 'uuid';

export function registerPolicySockets(io, socket) {
  const userId = socket.user?.id || socket.userId || socket.handshake?.auth?.userId;

  // ─── Policy CRUD ──────────────────────────

  /**
   * List all policies for a room
   */
  socket.on('policy:list', async ({ roomId }) => {
    try {
      const room = await Room.findByRoomId(roomId);
      if (!room) return socket.emit('policy:error', { message: 'Room not found' });

      // Auth check — only host/cohost can manage policies
      const authCheck = authorityEngine.canPerformAction(room, userId, 'CREATE_POLICY');
      if (!authCheck.allowed) {
        return socket.emit('policy:error', { message: authCheck.reason });
      }

      socket.emit('policy:list', {
        roomId,
        policies: room.policies ?? [],
        aiSuggestions: policyEngine.getAISuggestions(roomId),
      });
    } catch (err) {
      logger.error(`[PolicySocket] policy:list error: ${err.message}`);
      socket.emit('policy:error', { message: 'Failed to load policies' });
    }
  });

  /**
   * Create a new policy
   */
  socket.on('policy:create', async ({ roomId, policy }) => {
    try {
      await roomKernel.processEvent(io, {
        type:    'POLICY_CREATE',
        roomId,
        userId,
        payload: {
          policy: {
            ...policy,
            policyId:  uuidv4(),
            createdBy: userId,
            createdAt: new Date(),
            enabled:   true,
          },
        },
      }, { user: { id: userId } });
    } catch (err) {
      logger.error(`[PolicySocket] policy:create error: ${err.message}`);
      socket.emit('policy:error', { message: err.message });
    }
  });

  /**
   * Update (replace) an existing policy
   */
  socket.on('policy:update', async ({ roomId, policyId, updates }) => {
    try {
      const room = await Room.findByRoomId(roomId);
      if (!room) return socket.emit('policy:error', { message: 'Room not found' });

      const authCheck = authorityEngine.canPerformAction(room, userId, 'CREATE_POLICY');
      if (!authCheck.allowed) return socket.emit('policy:error', { message: authCheck.reason });

      if (!Array.isArray(room.policies)) return socket.emit('policy:error', { message: 'No policies found' });

      const idx = room.policies.findIndex(p => p.policyId === policyId);
      if (idx === -1) return socket.emit('policy:error', { message: 'Policy not found' });

      Object.assign(room.policies[idx], updates);
      room.markModified('policies');
      await room.save();

      io.to(roomId).emit('policy:updated', { policyId, updates });
    } catch (err) {
      logger.error(`[PolicySocket] policy:update error: ${err.message}`);
      socket.emit('policy:error', { message: err.message });
    }
  });

  /**
   * Delete a policy
   */
  socket.on('policy:delete', async ({ roomId, policyId }) => {
    try {
      await roomKernel.processEvent(io, {
        type:    'POLICY_DELETE',
        roomId,
        userId,
        payload: { policyId },
      }, { user: { id: userId } });
    } catch (err) {
      logger.error(`[PolicySocket] policy:delete error: ${err.message}`);
      socket.emit('policy:error', { message: err.message });
    }
  });

  /**
   * Toggle policy enabled/disabled
   */
  socket.on('policy:toggle', async ({ roomId, policyId, enabled }) => {
    try {
      const room = await Room.findByRoomId(roomId);
      if (!room) return socket.emit('policy:error', { message: 'Room not found' });

      const authCheck = authorityEngine.canPerformAction(room, userId, 'CREATE_POLICY');
      if (!authCheck.allowed) return socket.emit('policy:error', { message: authCheck.reason });

      const policy = room.policies?.find(p => p.policyId === policyId);
      if (!policy) return socket.emit('policy:error', { message: 'Policy not found' });

      policy.enabled = enabled;
      room.markModified('policies');
      await room.save();

      io.to(roomId).emit('policy:toggled', { policyId, enabled });
    } catch (err) {
      logger.error(`[PolicySocket] policy:toggle error: ${err.message}`);
      socket.emit('policy:error', { message: err.message });
    }
  });

  /**
   * Dry-run: evaluate a condition against a test context (no action executed)
   */
  socket.on('policy:dry_run', ({ roomId, condition, testContext }) => {
    try {
      const result = policyEngine.dryRun(condition, testContext);
      socket.emit('policy:dry_run_result', { roomId, condition, ...result });
    } catch (err) {
      socket.emit('policy:error', { message: err.message });
    }
  });

  /**
   * Apply a Smart Room Mode preset (creates multiple policies at once)
   */
  socket.on('policy:apply_smart_mode', async ({ roomId, modeName }) => {
    try {
      const room = await Room.findByRoomId(roomId);
      if (!room) return socket.emit('policy:error', { message: 'Room not found' });

      const authCheck = authorityEngine.canPerformAction(room, userId, 'CREATE_POLICY');
      if (!authCheck.allowed) return socket.emit('policy:error', { message: authCheck.reason });

      const newPolicies = policyEngine.buildSmartModePolicies(modeName, userId);
      if (!Array.isArray(room.policies)) room.policies = [];
      room.policies.push(...newPolicies);
      room.markModified('policies');
      await room.save();

      io.to(roomId).emit('policy:smart_mode_applied', { modeName, policies: newPolicies });
    } catch (err) {
      logger.error(`[PolicySocket] policy:apply_smart_mode error: ${err.message}`);
      socket.emit('policy:error', { message: err.message });
    }
  });

  // ─── AI Suggestions ───────────────────────

  /**
   * Approve an AI suggestion (apply its action to the room)
   */
  socket.on('ai:approve_suggestion', async ({ roomId, suggestionId }) => {
    try {
      const room = await Room.findByRoomId(roomId);
      if (!room) return socket.emit('policy:error', { message: 'Room not found' });

      const authCheck = authorityEngine.canPerformAction(room, userId, 'CREATE_POLICY');
      if (!authCheck.allowed) return socket.emit('policy:error', { message: authCheck.reason });

      const suggestions = policyEngine.getAISuggestions(roomId);
      const suggestion  = suggestions.find(s => s.id === suggestionId);
      if (!suggestion)   return socket.emit('policy:error', { message: 'Suggestion not found' });

      suggestion.approved = true;

      // If suggestion refers to a state transition
      if (suggestion.suggestedAction?.startsWith('transition_state:')) {
        const newState = suggestion.suggestedAction.split(':')[1];
        await roomKernel.processEvent(io, {
          type:    'STATE_CHANGE',
          roomId,
          userId,
          payload: { newState },
        }, { user: { id: userId } });
      }

      io.to(roomId).emit('ai:suggestion_approved', { suggestionId });
    } catch (err) {
      logger.error(`[PolicySocket] ai:approve_suggestion error: ${err.message}`);
      socket.emit('policy:error', { message: err.message });
    }
  });

  /**
   * Dismiss an AI suggestion
   */
  socket.on('ai:dismiss_suggestion', ({ roomId, suggestionId }) => {
    const suggestions = policyEngine.getAISuggestions(roomId);
    const idx = suggestions.findIndex(s => s.id === suggestionId);
    if (idx !== -1) suggestions.splice(idx, 1);
    socket.emit('ai:suggestion_dismissed', { suggestionId });
  });

  // ─── Room State Machine ───────────────────

  /**
   * Host requests a state transition
   */
  socket.on('room:state_change', async ({ roomId, newState }) => {
    await roomKernel.processEvent(io, {
      type:    'STATE_CHANGE',
      roomId,
      userId,
      payload: { newState },
    }, { user: { id: userId } });
  });

  /**
   * Get all valid states and current state of a room
   */
  socket.on('room:get_state', async ({ roomId }) => {
    try {
      const room = await Room.findByRoomId(roomId);
      if (!room) return socket.emit('policy:error', { message: 'Room not found' });

      const currentState = room.state ?? 'LIVE';
      socket.emit('room:state', {
        roomId,
        currentState,
        preset:      stateMachine.getPermissions(currentState),
        transitions: stateMachine.getAllStates(),
        stateHistory: (room.stateHistory ?? []).slice(-10),
      });
    } catch (err) {
      socket.emit('policy:error', { message: err.message });
    }
  });

  // ─── Authority Engine ─────────────────────

  /**
   * Grant a role to a participant
   */
  socket.on('authority:grant_role', async ({ roomId, targetUserId, newRole }) => {
    await roomKernel.processEvent(io, {
      type:    'ROLE_CHANGE',
      roomId,
      userId,
      payload: { targetUserId, newRole },
    }, { user: { id: userId } });
  });

  /**
   * Revoke a participant's explicit role (revert to LISTENER)
   */
  socket.on('authority:revoke_role', async ({ roomId, targetUserId }) => {
    try {
      const room = await Room.findByRoomId(roomId);
      if (!room) return socket.emit('policy:error', { message: 'Room not found' });

      if (!authorityEngine.hasAuthorityOver(room, userId, targetUserId)) {
        return socket.emit('policy:error', { message: 'Insufficient authority to revoke this role.' });
      }

      await authorityEngine.revokeRole(room, targetUserId, userId);
      io.to(roomId).emit('authority:role_revoked', { userId: targetUserId, revokedBy: userId });
    } catch (err) {
      socket.emit('policy:error', { message: err.message });
    }
  });

  /**
   * Get the full authority roster for a room
   */
  socket.on('authority:get_roster', async ({ roomId }) => {
    try {
      const room = await Room.findByRoomId(roomId);
      if (!room) return socket.emit('policy:error', { message: 'Room not found' });

      const roster = authorityEngine.getAuthorityRoster(room);
      const myRole = authorityEngine.getUserRole(room, userId);
      socket.emit('authority:roster', { roomId, roster, myRole });
    } catch (err) {
      socket.emit('policy:error', { message: err.message });
    }
  });

  // ─── Command Network ──────────────────────

  /**
   * Create or update a command network
   */
  socket.on('command:create_network', async ({ commandRoomId, childRoomIds }) => {
    try {
      const room = await Room.findByRoomId(commandRoomId);
      if (!room) return socket.emit('policy:error', { message: 'Command room not found' });

      const authCheck = authorityEngine.canPerformAction(room, userId, 'BROADCAST_TO_NETWORK');
      if (!authCheck.allowed) return socket.emit('policy:error', { message: authCheck.reason });

      const result = await commandNetwork.createCommandNetwork(commandRoomId, childRoomIds);
      socket.emit('command:network_created', result);
    } catch (err) {
      socket.emit('policy:error', { message: err.message });
    }
  });

  /**
   * Broadcast a message to all child rooms
   */
  socket.on('command:broadcast', async ({ commandRoomId, message }) => {
    try {
      const room = await Room.findByRoomId(commandRoomId);
      if (!room) return socket.emit('policy:error', { message: 'Room not found' });

      const authCheck = authorityEngine.canPerformAction(room, userId, 'BROADCAST_TO_NETWORK');
      if (!authCheck.allowed) return socket.emit('policy:error', { message: authCheck.reason });

      const result = commandNetwork.broadcastToNetwork(commandRoomId, message, io);
      socket.emit('command:broadcast_sent', result);
    } catch (err) {
      socket.emit('policy:error', { message: err.message });
    }
  });

  /**
   * Lock all child rooms (emergency)
   */
  socket.on('command:lock_all', async ({ commandRoomId }) => {
    try {
      const room = await Room.findByRoomId(commandRoomId);
      if (!room) return socket.emit('policy:error', { message: 'Room not found' });

      const authCheck = authorityEngine.canPerformAction(room, userId, 'LOCK_NETWORK');
      if (!authCheck.allowed) return socket.emit('policy:error', { message: authCheck.reason });

      const result = await commandNetwork.lockNetwork(commandRoomId, io);
      socket.emit('command:lock_result', result);
    } catch (err) {
      socket.emit('policy:error', { message: err.message });
    }
  });

  /**
   * End all sessions in the network
   */
  socket.on('command:end_all', async ({ commandRoomId }) => {
    try {
      const room = await Room.findByRoomId(commandRoomId);
      if (!room) return socket.emit('policy:error', { message: 'Room not found' });

      const authCheck = authorityEngine.canPerformAction(room, userId, 'LOCK_NETWORK');
      if (!authCheck.allowed) return socket.emit('policy:error', { message: authCheck.reason });

      const result = await commandNetwork.endAllSessions(commandRoomId, io);
      socket.emit('command:end_result', result);
    } catch (err) {
      socket.emit('policy:error', { message: err.message });
    }
  });

  /**
   * Inject a speaker from command room into child room
   */
  socket.on('command:inject_speaker', async ({ commandRoomId, targetRoomId, targetUserId }) => {
    try {
      const room = await Room.findByRoomId(commandRoomId);
      if (!room) return socket.emit('policy:error', { message: 'Room not found' });

      const authCheck = authorityEngine.canPerformAction(room, userId, 'INJECT_SPEAKER');
      if (!authCheck.allowed) return socket.emit('policy:error', { message: authCheck.reason });

      const result = commandNetwork.injectSpeaker(commandRoomId, targetRoomId, targetUserId, io);
      socket.emit('command:injection_result', result);
    } catch (err) {
      socket.emit('policy:error', { message: err.message });
    }
  });

  /**
   * Get live status of all child rooms in command network
   */
  socket.on('command:network_status', async ({ commandRoomId }) => {
    try {
      const status = await commandNetwork.getNetworkStatus(commandRoomId);
      socket.emit('command:network_status', { commandRoomId, ...status });
    } catch (err) {
      socket.emit('policy:error', { message: err.message });
    }
  });

  /**
   * Get kernel event log for a room
   */
  socket.on('kernel:event_log', ({ roomId }) => {
    try {
      const log = roomKernel.getEventLog(roomId);
      socket.emit('kernel:event_log', { roomId, log });
    } catch (err) {
      socket.emit('policy:error', { message: err.message });
    }
  });

  /**
   * Get kernel performance metrics for a room
   */
  socket.on('kernel:metrics', ({ roomId }) => {
    try {
      const metrics = roomKernel.getRoomMetrics(roomId);
      socket.emit('kernel:metrics', { roomId, metrics });
    } catch (err) {
      socket.emit('policy:error', { message: err.message });
    }
  });
}
