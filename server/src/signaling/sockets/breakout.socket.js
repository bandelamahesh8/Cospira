/**
 * breakout.socket.js — Server-side Breakout Session Socket Handlers
 * ─────────────────────────────────────────────────────────────────
 * Implements the 6-step authority pattern for every action:
 *   1. Resolve actor role from DB (NEVER trust client payload)
 *   2. Fetch current org + breakout state from DB
 *   3. Policy check via server-side logic
 *   4. On denial: emit 'policy:denied' + write to audit log
 *   5. On success: execute mutation + broadcast canonical state
 *   6. ULTRA_SECURE: write to audit log on success too
 *
 * Socket rooms used:
 *   org:{orgId}           — All org members
 *   org:{orgId}:owner     — Owner private channel
 *   breakout:{breakoutId} — Breakout participants
 *   lobby:{orgId}         — Org lobby users
 */

import logger from '../../shared/logger.js';
import { supabase } from '../../shared/supabase.js';
import crypto from 'crypto';
import { enqueueForAI, AI_EVENT_TYPES } from './breakout-ai.socket.js';

// ─────────────────────────────────────────────────────────────
// Policy Engine (server-side, mirrors ModePolicyResolver)
// ─────────────────────────────────────────────────────────────

/**
 * Resolves the effective mode from org mode + optional breakout override.
 * MIXED defers to the breakout's mode_override, or falls back to PROF.
 */
function resolveEffectiveMode(orgMode, modeOverride) {
  if (orgMode === 'MIXED') {
    if (modeOverride && modeOverride !== 'MIXED') return modeOverride;
    return 'PROF'; // Conservative MIXED default
  }
  return orgMode;
}

/**
 * Returns the server-side policy profile for the given effective mode.
 */
function getServerPolicy(effectiveMode) {
  const policies = {
    FUN: {
      canParticipantRequestMove: true,
      canHostReassignParticipant: true,
      mandatoryRecording: false,
      requiresImmutableAudit: false,
    },
    PROF: {
      canParticipantRequestMove: false,
      canHostReassignParticipant: false,
      mandatoryRecording: false,
      requiresImmutableAudit: false,
    },
    ULTRA_SECURE: {
      canParticipantRequestMove: false,
      canHostReassignParticipant: false,
      mandatoryRecording: true,
      requiresImmutableAudit: true,
    },
    MIXED: {
      canParticipantRequestMove: true,
      canHostReassignParticipant: true,
      mandatoryRecording: false,
      requiresImmutableAudit: false,
    },
  };
  return policies[effectiveMode] ?? policies.PROF;
}

/**
 * Host failure policy per mode — what happens when the host disconnects.
 */
function getHostFailurePolicy(effectiveMode) {
  const policies = {
    FUN: {
      gracePeriodMs: 0,
      action: 'CONTINUE',
      notifyOwner: false,
      requireOwnerIntervention: false,
      bannerMessage: 'Host disconnected — session continues. They can rejoin at any time.',
    },
    PROF: {
      gracePeriodMs: 30_000,
      action: 'CONTINUE',
      notifyOwner: true,
      requireOwnerIntervention: false,
      bannerMessage: 'Host is temporarily away — session continues. Owner has been notified.',
    },
    ULTRA_SECURE: {
      gracePeriodMs: 0,
      action: 'PAUSE',
      notifyOwner: true,
      requireOwnerIntervention: true,
      bannerMessage:
        'ULTRA SECURE: Session paused because host disconnected. Owner must resume before continuing.',
    },
    MIXED: {
      gracePeriodMs: 15_000,
      action: 'CONTINUE',
      notifyOwner: true,
      requireOwnerIntervention: false,
      bannerMessage: 'Host disconnected — session continues. Mode: MIXED (Flex Access Enabled).',
    },
  };
  return policies[effectiveMode] ?? policies.PROF;
}

// ─────────────────────────────────────────────────────────────
// DB Helpers (use Supabase service role — no RLS restrictions)
// ─────────────────────────────────────────────────────────────

async function getOrg(orgId) {
  if (!orgId) return null;
  const { data, error } = await supabase
    .from('organizations')
    .select('id, owner_id, mode')
    .eq('id', orgId)
    .maybeSingle();
  
  if (error) {
    logger.error(`[BreakoutSocket] Error fetching org ${orgId}:`, error.message);
    throw error;
  }
  return data;
}

async function getBreakout(breakoutId) {
  const { data, error } = await supabase
    .from('breakout_sessions')
    .select('id, organization_id, host_id, status, mode_override, name')
    .eq('id', breakoutId)
    .single();
  if (error) throw error;
  return data;
}

async function getLiveBreakouts(orgId) {
  const { data, error } = await supabase
    .from('breakout_sessions')
    .select('id, name, status')
    .eq('organization_id', orgId)
    .eq('status', 'LIVE');
  if (error) throw error;
  return data ?? [];
}

async function getActiveBreakoutsHostedBy(userId) {
  const { data, error } = await supabase
    .from('breakout_sessions')
    .select('id, organization_id, name, status, mode_override')
    .eq('host_id', userId)
    .in('status', ['LIVE', 'CREATED']);
  if (error) throw error;
  return data ?? [];
}

async function updateBreakoutStatus(breakoutId, status) {
  const { error } = await supabase
    .from('breakout_sessions')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', breakoutId);
  if (error) throw error;
}

async function updateOrgMode(orgId, newMode) {
  const { error } = await supabase
    .from('organizations')
    .update({ mode: newMode })
    .eq('id', orgId);
  if (error) throw error;
}

/**
 * Resolve actor role for a user in the context of an org (and optionally a breakout).
 * OWNER > HOST > PARTICIPANT
 */
async function resolveActorRole(userId, orgId, breakoutId = null) {
  if (!userId || !orgId) return 'PARTICIPANT';

  try {
    const org = await getOrg(orgId);
    if (org.owner_id === userId) return 'OWNER';

    if (breakoutId) {
      const breakout = await getBreakout(breakoutId);
      if (breakout?.host_id === userId) return 'HOST';
    }

    return 'PARTICIPANT';
  } catch (err) {
    logger.error('[BreakoutSocket] resolveActorRole error:', err);
    return 'PARTICIPANT';
  }
}

// ─────────────────────────────────────────────────────────────
// Audit Logging (append-only via server — client cannot write)
// ─────────────────────────────────────────────────────────────

async function writeAuditEvent({ orgId, breakoutId, actorId, action, payload, mode, auditCode, denialReason }) {
  if (!supabase) return null;

  try {
    const payloadJson = JSON.stringify(payload ?? {});
    const hash = crypto.createHash('sha256').update(payloadJson).digest('hex');

    const { data, error } = await supabase
      .from('breakout_audit_events')
      .insert({
        org_id: orgId,
        breakout_id: breakoutId ?? null,
        actor_id: actorId,
        action,
        payload: payload ?? {},
        payload_hash: hash,
        mode,
        audit_code: auditCode ?? null,
        denial_reason: denialReason ?? null,
      })
      .select('id')
      .single();

    if (error) throw error;

    // Return the UUID of the audit row for correlation
    return data?.id ?? null;
  } catch (err) {
    // Never throw — audit failure must not block the action
    logger.error('[BreakoutSocket] Audit write failed:', err.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// Policy denial emitter
// ─────────────────────────────────────────────────────────────

/**
 * GAP 1 — Deny with correlation ID.
 * Returns audit_event_id in the payload so the client can reference it in
 * support escalation, legal traceability, and audit log lookup.
 */
async function emitDenial(socket, { orgId, breakoutId, userId, effectiveMode, action, auditCode, reason }) {
  // Write audit first so we can include the row ID in the denial
  const auditEventId = await writeAuditEvent({
    orgId,
    breakoutId,
    actorId: userId,
    action: 'POLICY_DENIED',
    payload: { action, auditCode, reason },
    mode: effectiveMode,
    auditCode,
    denialReason: reason,
  });

  socket.emit('policy:denied', { action, auditCode, reason, wasAudited: true, audit_event_id: auditEventId });

  // ── AI Ingestion ──
  enqueueForAI({
    type: AI_EVENT_TYPES.POLICY_DENIED,
    orgId,
    breakoutId,
    mode: effectiveMode,
    payload: { action, auditCode, actorId: userId, reason },
  });

  logger.warn(`[BreakoutSocket] Policy denied: ${action} | user:${userId} | org:${orgId} | audit:${auditEventId} | ${reason}`);
}

// ─────────────────────────────────────────────────────────────
// Main Handler Registration
// ─────────────────────────────────────────────────────────────

export default function registerBreakoutHandlers(io, socket) {
  const userId = socket.user?.id || socket.user?.sub;

  // ── breakout:start ────────────────────────────────────────
  socket.on('breakout:start', async ({ orgId, breakoutId }, callback) => {
    try {
      const actorRole = await resolveActorRole(userId, orgId, breakoutId);
      const org = await getOrg(orgId);
      const breakout = await getBreakout(breakoutId);
      const effectiveMode = resolveEffectiveMode(org.mode, breakout.mode_override);
      const policy = getServerPolicy(effectiveMode);

      // ── Policy checks ──
      if (actorRole !== 'OWNER') {
        await emitDenial(socket, { orgId, breakoutId, userId, effectiveMode, action: 'START_BREAKOUT', auditCode: 'START_NOT_OWNER', reason: 'Only org owner can start breakouts' });
        return callback?.({ success: false, error: 'Only org owner can start breakouts' });
      }
      if (!breakout.host_id) {
        await emitDenial(socket, { orgId, breakoutId, userId, effectiveMode, action: 'START_BREAKOUT', auditCode: 'START_NO_HOST', reason: 'No host assigned — cannot start' });
        return callback?.({ success: false, error: 'No host assigned — assign a host first' });
      }
      if (breakout.status !== 'CREATED') {
        await emitDenial(socket, { orgId, breakoutId, userId, effectiveMode, action: 'START_BREAKOUT', auditCode: 'START_WRONG_STATUS', reason: `Breakout is ${breakout.status} — only CREATED can be started` });
        return callback?.({ success: false, error: `Breakout is ${breakout.status}` });
      }

      // ── Execute ──
      await updateBreakoutStatus(breakoutId, 'LIVE');

      // ── GAP 2: Broadcast full state snapshot (no client DB re-query needed) ──
      const snapshot = { breakoutId, status: 'LIVE', hostId: breakout.host_id, name: breakout.name, mode: effectiveMode };
      io.to(`org:${orgId}`).emit('breakout:started', { breakoutId, orgId, name: breakout.name });
      io.to(`org:${orgId}`).emit('breakout:state-updated', snapshot);
      io.to(`breakout:${breakoutId}`).emit('breakout:state-updated', snapshot);

      // ── Audit (ULTRA always) ──
      const auditId = policy.requiresImmutableAudit
        ? await writeAuditEvent({ orgId, breakoutId, actorId: userId, action: 'BREAKOUT_STARTED', payload: { breakoutId }, mode: effectiveMode })
        : null;

      // ── AI Ingestion ──
      enqueueForAI({
        type: AI_EVENT_TYPES.STATE_SNAPSHOT,
        orgId,
        breakoutId,
        mode: effectiveMode,
        payload: { status: 'LIVE', hostId: breakout.host_id },
      });

      logger.info(`[BreakoutSocket] Breakout ${breakoutId} STARTED by owner ${userId} | audit:${auditId}`);
      callback?.({ success: true, snapshot, audit_event_id: auditId });
    } catch (err) {
      logger.error('[BreakoutSocket] breakout:start error:', err.message);
      callback?.({ success: false, error: err.message });
    }
  });

  // ── breakout:pause ────────────────────────────────────────
  socket.on('breakout:pause', async ({ orgId, breakoutId }, callback) => {
    try {
      const actorRole = await resolveActorRole(userId, orgId, breakoutId);
      const org = await getOrg(orgId);
      const breakout = await getBreakout(breakoutId);
      const effectiveMode = resolveEffectiveMode(org.mode, breakout.mode_override);
      const policy = getServerPolicy(effectiveMode);

      if (actorRole !== 'OWNER') {
        await emitDenial(socket, { orgId, breakoutId, userId, effectiveMode, action: 'PAUSE_BREAKOUT', auditCode: 'PAUSE_NOT_OWNER', reason: 'Only org owner can pause breakouts' });
        return callback?.({ success: false });
      }
      if (breakout.status !== 'LIVE') {
        await emitDenial(socket, { orgId, breakoutId, userId, effectiveMode, action: 'PAUSE_BREAKOUT', auditCode: 'PAUSE_NOT_LIVE', reason: `Cannot pause — status is ${breakout.status}` });
        return callback?.({ success: false });
      }

      await updateBreakoutStatus(breakoutId, 'PAUSED');

      // ── GAP 2: Broadcast full state snapshot ──
      const snapshot = { breakoutId, status: 'PAUSED', hostId: breakout.host_id, name: breakout.name, mode: effectiveMode };
      io.to(`org:${orgId}`).emit('breakout:paused', { breakoutId, reason: 'OWNER_MANUAL', bannerMessage: 'Session paused by owner.', ...snapshot });
      io.to(`org:${orgId}`).emit('breakout:state-updated', snapshot);
      io.to(`breakout:${breakoutId}`).emit('breakout:state-updated', snapshot);

      if (policy.requiresImmutableAudit) {
        await writeAuditEvent({ orgId, breakoutId, actorId: userId, action: 'BREAKOUT_PAUSED', payload: { breakoutId, reason: 'OWNER_MANUAL' }, mode: effectiveMode });
      }

      // ── AI Ingestion ──
      enqueueForAI({
        type: AI_EVENT_TYPES.STATE_SNAPSHOT,
        orgId,
        breakoutId,
        mode: effectiveMode,
        payload: { status: 'PAUSED', hostId: breakout.host_id, reason: 'OWNER_MANUAL' },
      });

      callback?.({ success: true });
    } catch (err) {
      logger.error('[BreakoutSocket] breakout:pause error:', err.message);
      callback?.({ success: false, error: err.message });
    }
  });

  // ── breakout:resume ───────────────────────────────────────
  // GAP 3 — ULTRA recovery lockdown:
  //   • Only OWNER can resume (re-verified from DB, not token)
  //   • ULTRA_SECURE: new host MUST be explicitly provided
  //   • ULTRA_SECURE: host re-verified from DB before allowing resume
  //   • ULTRA_SECURE: BREAKOUT_RESUMED always audited (regardless of flag)
  socket.on('breakout:resume', async ({ orgId, breakoutId, newHostId }, callback) => {
    try {
      const actorRole = await resolveActorRole(userId, orgId, breakoutId);
      const org = await getOrg(orgId);
      const breakout = await getBreakout(breakoutId);
      const effectiveMode = resolveEffectiveMode(org.mode, breakout.mode_override);
      const policy = getServerPolicy(effectiveMode);
      const isUltra = effectiveMode === 'ULTRA_SECURE';

      if (actorRole !== 'OWNER') {
        await emitDenial(socket, { orgId, breakoutId, userId, effectiveMode, action: 'RESUME_BREAKOUT', auditCode: 'RESUME_NOT_OWNER', reason: 'Only org owner can resume breakouts' });
        return callback?.({ success: false });
      }
      if (breakout.status !== 'PAUSED') {
        await emitDenial(socket, { orgId, breakoutId, userId, effectiveMode, action: 'RESUME_BREAKOUT', auditCode: 'RESUME_NOT_PAUSED', reason: `Cannot resume — status is ${breakout.status}` });
        return callback?.({ success: false });
      }

      // ── GAP 3: ULTRA requires explicit new host assignment ──
      if (isUltra) {
        if (!newHostId) {
          await emitDenial(socket, { orgId, breakoutId, userId, effectiveMode, action: 'RESUME_BREAKOUT', auditCode: 'ULTRA_RESUME_NO_NEW_HOST', reason: 'ULTRA SECURE: a new host must be explicitly assigned before resuming' });
          return callback?.({ success: false, error: 'Provide newHostId to resume an ULTRA SECURE session' });
        }

        // Verify new host exists in org (DB-verified, not client claim)
        const { data: hostProfile, error: hostErr } = await supabase
          .from('organization_members')
          .select('user_id')
          .eq('organization_id', orgId)
          .eq('user_id', newHostId)
          .single();

        if (hostErr || !hostProfile) {
          await emitDenial(socket, { orgId, breakoutId, userId, effectiveMode, action: 'RESUME_BREAKOUT', auditCode: 'ULTRA_RESUME_INVALID_HOST', reason: 'Provided host is not a member of this organization' });
          return callback?.({ success: false, error: 'New host is not an org member' });
        }

        // Explicitly reassign host before resuming
        const { error: hostAssignErr } = await supabase
          .from('breakout_sessions')
          .update({ host_id: newHostId })
          .eq('id', breakoutId);
        if (hostAssignErr) throw hostAssignErr;

        logger.info(`[BreakoutSocket] ULTRA: New host ${newHostId} assigned to breakout ${breakoutId} before resume`);
      } else {
        // FUN/PROF: still require SOME host assigned
        if (!breakout.host_id) {
          await emitDenial(socket, { orgId, breakoutId, userId, effectiveMode, action: 'RESUME_BREAKOUT', auditCode: 'RESUME_NO_HOST', reason: 'No host assigned — cannot resume without a host' });
          return callback?.({ success: false });
        }
      }

      await updateBreakoutStatus(breakoutId, 'LIVE');

      const resolvedHostId = isUltra ? newHostId : breakout.host_id;
      // ── GAP 2: Full snapshot broadcast ──
      const snapshot = { breakoutId, status: 'LIVE', hostId: resolvedHostId, name: breakout.name, mode: effectiveMode };
      io.to(`org:${orgId}`).emit('breakout:resumed', { breakoutId, ...snapshot });
      io.to(`org:${orgId}`).emit('breakout:state-updated', snapshot);
      io.to(`breakout:${breakoutId}`).emit('breakout:state-updated', snapshot);

      // ── GAP 3: ULTRA always audits resume — write regardless of policy flag ──
      const auditId = (policy.requiresImmutableAudit || isUltra)
        ? await writeAuditEvent({
            orgId, breakoutId, actorId: userId,
            action: 'BREAKOUT_RESUMED',
            payload: { breakoutId, newHostId: resolvedHostId, resumedAfterHostDisconnect: isUltra },
            mode: effectiveMode,
          })
        : null;

      // ── AI Ingestion ──
      enqueueForAI({
        type: AI_EVENT_TYPES.STATE_SNAPSHOT,
        orgId,
        breakoutId,
        mode: effectiveMode,
        payload: { status: 'LIVE', hostId: resolvedHostId },
      });

      logger.info(`[BreakoutSocket] Breakout ${breakoutId} RESUMED by owner ${userId} | host:${resolvedHostId} | audit:${auditId}`);
      callback?.({ success: true, snapshot, audit_event_id: auditId });
    } catch (err) {
      logger.error('[BreakoutSocket] breakout:resume error:', err.message);
      callback?.({ success: false, error: err.message });
    }
  });

  // ── breakout:close ────────────────────────────────────────
  socket.on('breakout:close', async ({ orgId, breakoutId }, callback) => {
    try {
      const actorRole = await resolveActorRole(userId, orgId, breakoutId);
      const org = await getOrg(orgId);
      const breakout = await getBreakout(breakoutId);
      const effectiveMode = resolveEffectiveMode(org.mode, breakout.mode_override);
      const policy = getServerPolicy(effectiveMode);

      if (actorRole !== 'OWNER') {
        await emitDenial(socket, { orgId, breakoutId, userId, effectiveMode, action: 'CLOSE_BREAKOUT', auditCode: 'CLOSE_NOT_OWNER', reason: 'Only org owner can close breakouts' });
        return callback?.({ success: false });
      }
      if (breakout.status === 'CLOSED') {
        return callback?.({ success: true }); // Idempotent
      }

      await updateBreakoutStatus(breakoutId, 'CLOSED');

      // ── GAP 2: Full snapshot broadcast ──
      const snapshot = { breakoutId, status: 'CLOSED', hostId: breakout.host_id, name: breakout.name, mode: effectiveMode };
      io.to(`org:${orgId}`).emit('breakout:closed', { breakoutId });
      io.to(`org:${orgId}`).emit('breakout:state-updated', snapshot);
      io.to(`breakout:${breakoutId}`).emit('breakout:state-updated', snapshot);

      if (policy.requiresImmutableAudit) {
        await writeAuditEvent({ orgId, breakoutId, actorId: userId, action: 'BREAKOUT_CLOSED', payload: { breakoutId }, mode: effectiveMode });
      }

      // ── AI Ingestion ──
      enqueueForAI({
        type: AI_EVENT_TYPES.BREAKOUT_CLOSED,
        orgId,
        breakoutId,
        mode: effectiveMode,
        payload: { durationMs: 0 }, // Would need real track
      });

      callback?.({ success: true });
    } catch (err) {
      logger.error('[BreakoutSocket] breakout:close error:', err.message);
      callback?.({ success: false, error: err.message });
    }
  });

  // ── org:mode-switch (GAP 4 — SERVER-SIDE GUARD) ──────────
  socket.on('org:mode-switch', async ({ orgId, newMode }, callback) => {
    try {
      const actorRole = await resolveActorRole(userId, orgId);
      const org = await getOrg(orgId);
      const effectiveMode = resolveEffectiveMode(org.mode, null);

      if (actorRole !== 'OWNER') {
        await emitDenial(socket, { orgId, userId, effectiveMode, action: 'MODE_SWITCH', auditCode: 'MODE_SWITCH_NOT_OWNER', reason: 'Only org owner can switch mode' });
        return callback?.({ success: false });
      }

      // ── DB-side check for LIVE breakouts (never trust client claim) ──
      const liveBreakouts = await getLiveBreakouts(orgId);
      if (liveBreakouts.length > 0) {
        const names = liveBreakouts.map(b => b.name).join(', ');
        await emitDenial(socket, {
          orgId, userId, effectiveMode,
          action: 'MODE_SWITCH',
          auditCode: 'MODE_SWITCH_LIVE_BREAKOUTS',
          reason: `${liveBreakouts.length} LIVE breakout(s) must be closed first: ${names}`,
        });
        return callback?.({ success: false, error: `Close all LIVE breakouts first (${names})` });
      }

      await updateOrgMode(orgId, newMode);

      io.to(`org:${orgId}`).emit('org:mode-changed', { orgId, newMode });

      // Audit if switching to or from ULTRA_SECURE
      if (newMode === 'ULTRA_SECURE' || org.mode === 'ULTRA_SECURE') {
        await writeAuditEvent({
          orgId, actorId: userId,
          action: 'MODE_SWITCHED',
          payload: { from: org.mode, to: newMode },
          mode: newMode,
        });
      }

      logger.info(`[BreakoutSocket] Org ${orgId} mode switched: ${org.mode} → ${newMode} by owner ${userId}`);
      callback?.({ success: true, newMode });
    } catch (err) {
      logger.error('[BreakoutSocket] org:mode-switch error:', err.message);
      callback?.({ success: false, error: err.message });
    }
  });

  // ── breakout:assign-host ──────────────────────────────────
  socket.on('breakout:assign-host', async ({ orgId, breakoutId, hostUserId }, callback) => {
    try {
      const actorRole = await resolveActorRole(userId, orgId, breakoutId);
      if (actorRole !== 'OWNER') {
        const org = await getOrg(orgId);
        const breakout = await getBreakout(breakoutId);
        const effectiveMode = resolveEffectiveMode(org.mode, breakout.mode_override);
        await emitDenial(socket, { orgId, breakoutId, userId, effectiveMode, action: 'ASSIGN_HOST', auditCode: 'ASSIGN_HOST_NOT_OWNER', reason: 'Only org owner can assign hosts' });
        return callback?.({ success: false });
      }

      const { error } = await supabase
        .from('breakout_sessions')
        .update({ host_id: hostUserId })
        .eq('id', breakoutId);

      if (error) throw error;

      io.to(`org:${orgId}`).emit('breakout:state-updated', { breakoutId, hostId: hostUserId });

      // ── AI Ingestion ──
      enqueueForAI({
        type: AI_EVENT_TYPES.STATE_SNAPSHOT,
        orgId,
        breakoutId,
        mode: effectiveMode,
        payload: { status: breakout.status, hostId: hostUserId, action: 'ASSIGN_HOST' },
      });

      callback?.({ success: true });
    } catch (err) {
      logger.error('[BreakoutSocket] breakout:assign-host error:', err.message);
      callback?.({ success: false, error: err.message });
    }
  });

  // ── breakout:assign-participant ───────────────────────────
  socket.on('breakout:assign-participant', async ({ orgId, breakoutId, participantUserId }, callback) => {
    try {
      const actorRole = await resolveActorRole(userId, orgId, breakoutId);
      if (actorRole !== 'OWNER') {
        const org = await getOrg(orgId);
        const breakout = await getBreakout(breakoutId);
        const effectiveMode = resolveEffectiveMode(org.mode, breakout.mode_override);
        await emitDenial(socket, { orgId, breakoutId, userId, effectiveMode, action: 'ASSIGN_PARTICIPANT', auditCode: 'ASSIGN_PARTICIPANT_NOT_OWNER', reason: 'Only org owner can assign participants' });
        return callback?.({ success: false });
      }

      const { error } = await supabase
        .from('breakout_participants')
        .upsert({ breakout_id: breakoutId, user_id: participantUserId, role: 'PARTICIPANT' });

      if (error) throw error;

      io.to(`org:${orgId}`).emit('breakout:participant-list', { breakoutId });
      io.to(`breakout:${breakoutId}`).emit('participant:assigned', { userId: participantUserId });

      // ── AI Ingestion ──
      enqueueForAI({
        type: AI_EVENT_TYPES.PARTICIPANT_SNAPSHOT,
        orgId,
        breakoutId,
        mode: effectiveMode,
        payload: { action: 'ASSIGN', participantUserId },
      });

      callback?.({ success: true });
    } catch (err) {
      logger.error('[BreakoutSocket] breakout:assign-participant error:', err.message);
      callback?.({ success: false, error: err.message });
    }
  });

  // ── breakout:sync-participants (GAP/AI trigger for batch assigns) ──
  socket.on('breakout:sync-participants', async ({ orgId, breakoutId }, callback) => {
    try {
      const actorRole = await resolveActorRole(userId, orgId);
      if (actorRole !== 'OWNER') {
        return callback?.({ success: false, error: 'Unauthorized' });
      }

      const org = await getOrg(orgId);
      const effectiveMode = resolveEffectiveMode(org.mode, null); // Rough estimate

      // ── AI Ingestion ──
      // Fire a snapshot event to trigger the BreakoutAssignmentAdvisor
      // It will fetch fresh counts locally.
      enqueueForAI({
        type: AI_EVENT_TYPES.PARTICIPANT_SNAPSHOT,
        orgId,
        breakoutId,
        mode: effectiveMode,
        payload: { action: 'BATCH_SYNC' },
      });

      callback?.({ success: true });
    } catch (err) {
      logger.error('[BreakoutSocket] breakout:sync-participants error:', err.message);
      callback?.({ success: false, error: err.message });
    }
  });

  // ── presence:heartbeat ────────────────────────────────────
  socket.on('presence:heartbeat', ({ orgId }) => {
    // Re-emit to keep user in org room (Redis TTL refresh would happen here in prod)
    socket.join(`org:${orgId}`);
    socket.join(`lobby:${orgId}`);
  });

  // ── breakout:join-room (join socket room) ─────────────────
  socket.on('breakout:join-room', async ({ breakoutId, orgId }) => {
    socket.join(`breakout:${breakoutId}`);
    socket.join(`org:${orgId}`);
    socket.leave(`lobby:${orgId}`);
    logger.debug(`[BreakoutSocket] Socket ${socket.id} joined breakout:${breakoutId}`);
    
    // Broadcast updated lobby presence (since they left the lobby)
    await broadcastLobbyPresence(io, orgId);
  });

  // ── breakout:leave-room (leave socket room) ───────────────
  socket.on('breakout:leave-room', async ({ breakoutId, orgId }) => {
    socket.leave(`breakout:${breakoutId}`);
    socket.join(`lobby:${orgId}`);
    logger.debug(`[BreakoutSocket] Socket ${socket.id} left breakout:${breakoutId}`);
    
    // Broadcast updated lobby presence (since they joined the lobby)
    await broadcastLobbyPresence(io, orgId);
  });

  socket.on('org:join', async ({ orgId }) => {
    try {
      const org = await getOrg(orgId);
      if (!org) return;

      socket.join(`org:${orgId}`);
      socket.join(`lobby:${orgId}`);

      // Broadcast updated lobby presence
      await broadcastLobbyPresence(io, orgId);

      // If this user is the owner, also join the owner private room
      if (userId) {
        if (org.owner_id === userId) {
          socket.join(`org:${orgId}:owner`);
          logger.debug(`[BreakoutSocket] Owner ${userId} joined org:${orgId}:owner`);
        }
      }
    } catch (err) {
      logger.error(`[BreakoutSocket] org:join error:`, err.message);
    }
  });

  // ── org:master-broadcast:send (Global Broadcast) ──────────
  socket.on('org:master-broadcast:send', async ({ orgId, message, targetBreakoutId }) => {
    try {
      const actorRole = await resolveActorRole(userId, orgId);
      if (actorRole !== 'OWNER') {
        logger.warn(`[BreakoutSocket] Non-owner ${userId} attempted master broadcast in ${orgId}`);
        return;
      }

      const payload = { message, senderId: userId, orgId };

      if (targetBreakoutId) {
        // Broadcast to specific breakout
        io.to(`breakout:${targetBreakoutId}`).emit('org:master-broadcast', payload);
        logger.info(`[BreakoutSocket] Master broadcast sent to breakout ${targetBreakoutId}`);
      } else {
        // Broadcast to ALL org nested rooms (everyone in the org room receives it)
        io.to(`org:${orgId}`).emit('org:master-broadcast', payload);
        logger.info(`[BreakoutSocket] Master broadcast sent globally to org ${orgId}`);
      }
    } catch (err) {
      logger.error(`[BreakoutSocket] Master broadcast error:`, err.message);
    }
  });
}

/**
 * Broadcasts the current list of users in the organization lobby.
 * Uses fetchSockets() to get live data from the room.
 */
async function broadcastLobbyPresence(io, orgId) {
  try {
    const sockets = await io.in(`lobby:${orgId}`).fetchSockets();
    const users = sockets.map(s => ({
      user_id: s.user?.id || s.user?.sub || s.id,
      display_name: s.user?.name || s.user?.display_name || 'Anonymous',
      avatar_url: s.user?.avatar_url || s.user?.avatarUrl,
      organization_id: orgId,
      location: 'LOBBY',
      lastSeen: new Date().toISOString()
    }));
    
    // Deduplicate by user_id
    const uniqueUsers = Array.from(new Map(users.map(u => [u.user_id, u])).values());
    
    io.to(`org:${orgId}`).emit('presence:lobby-updated', uniqueUsers);
    logger.debug(`[BreakoutSocket] Broadcasted lobby presence for org:${orgId} (${uniqueUsers.length} users)`);
  } catch (err) {
    logger.error(`[BreakoutSocket] broadcastLobbyPresence error:`, err.message);
  }
}

// ─────────────────────────────────────────────────────────────
// Disconnect handler — GAP 5: Host Failure Policy
// Export separately so sockets/index.js can call it in disconnecting
// ─────────────────────────────────────────────────────────────

export async function handleBreakoutHostDisconnect(io, userId) {
  if (!supabase || !userId) return;

  try {
    const hostingBreakouts = await getActiveBreakoutsHostedBy(userId);
    if (hostingBreakouts.length === 0) return;

    for (const breakout of hostingBreakouts) {
        if (!breakout.organization_id) {
          logger.warn(`[BreakoutSocket] Host ${userId} disconnected from breakout ${breakout.id} which has NO organization_id. Skipping.`);
          continue;
        }

        try {
          const org = await getOrg(breakout.organization_id);
          if (!org) {
            logger.warn(`[BreakoutSocket] Organization ${breakout.organization_id} not found for breakout ${breakout.id}. Skipping.`);
            continue;
          }

          const effectiveMode = resolveEffectiveMode(org.mode, breakout.mode_override);
          const failurePolicy = getHostFailurePolicy(effectiveMode);

          if (failurePolicy.action === 'PAUSE') {
            // ULTRA_SECURE: pause immediately
            await updateBreakoutStatus(breakout.id, 'PAUSED');

            io.to(`breakout:${breakout.id}`).emit('breakout:paused', {
              breakoutId: breakout.id,
              reason: 'HOST_DISCONNECTED',
              requiresOwnerIntervention: failurePolicy.requireOwnerIntervention,
              bannerMessage: failurePolicy.bannerMessage,
            });

            io.to(`org:${breakout.organization_id}`).emit('breakout:state-updated', {
              breakoutId: breakout.id,
              status: 'PAUSED',
            });

            if (failurePolicy.notifyOwner) {
              io.to(`org:${breakout.organization_id}:owner`).emit('breakout:host-disconnected', {
                breakoutId: breakout.id,
                breakoutName: breakout.name,
              });
            }

            // Audit the auto-pause (ULTRA always)
            await writeAuditEvent({
              orgId: breakout.organization_id,
              breakoutId: breakout.id,
              actorId: userId,
              action: 'BREAKOUT_PAUSED',
              payload: { reason: 'HOST_DISCONNECTED', breakoutId: breakout.id },
              mode: effectiveMode,
            });

            // ── AI Ingestion ──
            enqueueForAI({
              type: AI_EVENT_TYPES.HOST_DISCONNECTED,
              orgId: breakout.organization_id,
              breakoutId: breakout.id,
              mode: effectiveMode,
              payload: { status: 'PAUSED', hostId: userId },
            });

            logger.info(`[BreakoutSocket] Breakout ${breakout.id} PAUSED — host ${userId} disconnected (${effectiveMode})`);
          } else {
            // FUN/PROF: session continues
            io.to(`breakout:${breakout.id}`).emit('breakout:state-updated', {
              breakoutId: breakout.id,
              hostDisconnected: true,
              bannerMessage: failurePolicy.bannerMessage,
            });

            // PROF: notify owner after grace period
            if (failurePolicy.notifyOwner && failurePolicy.gracePeriodMs > 0) {
              setTimeout(() => {
                io.to(`org:${breakout.organization_id}:owner`).emit('breakout:host-absent-warning', {
                  breakoutId: breakout.id,
                  breakoutName: breakout.name,
                  gracePeriodMs: failurePolicy.gracePeriodMs,
                });
              }, failurePolicy.gracePeriodMs);
            }
          }
        } catch (breakoutErr) {
          const errorMsg = breakoutErr instanceof Error ? breakoutErr.message : JSON.stringify(breakoutErr);
          logger.error(`[BreakoutSocket] Error handling host disconnect for breakout ${breakout.id}: ${errorMsg}`);
        }
    }
  } catch (err) {
    logger.error('[BreakoutSocket] handleBreakoutHostDisconnect error:', err.message);
  }
}
