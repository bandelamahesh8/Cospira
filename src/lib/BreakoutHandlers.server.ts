/**
 * BreakoutHandlers — Server-side Socket.IO handlers
 * ─────────────────────────────────────────────────────────────
 * This file is the SERVER-SIDE implementation stub.
 * It lives in the client codebase as a reference/contract,
 * but is deployed on the Node.js server.
 *
 * Copy this to your server's src/handlers/BreakoutHandlers.ts
 * and wire it up in your Socket.IO initialization.
 *
 * EVERY handler must:
 *   1. Extract userId from socket.data (set during auth middleware)
 *   2. Re-fetch org + breakout mode from DB (never trust client payload)
 *   3. Call resolvePolicyForAction() from BreakoutPolicyEngine
 *   4. On denial: emit POLICY_DENIED + write to audit log
 *   5. On success: execute mutation + broadcast canonical state to room
 *   6. In ULTRA_SECURE: always write to audit log on success too
 *
 * SOCKET AUTH MIDDLEWARE (apply before these handlers):
 *   io.use(async (socket, next) => {
 *     const token = socket.handshake.auth.token;
 *     const { data: user } = await supabase.auth.getUser(token);
 *     if (!user) return next(new Error('Unauthorized'));
 *     socket.data.userId = user.user.id;
 *     next();
 *   });
 */

import {
  resolvePolicyForAction,
  resolveEffectiveModeServer,
  requiresAuditLog,
  ALWAYS_AUDIT_DENIAL,
  BreakoutActorRole,
} from '@/lib/BreakoutPolicyEngine';
import { getHostFailurePolicy } from '@/lib/HostFailurePolicy';
import { SOCKET_ROOMS, SOCKET_EVENTS, PolicyDeniedPayload } from '@/lib/SocketRoomStrategy';
import { OrgMode, Organization, BreakoutSession } from '@/types/organization';

// ─────────────────────────────────────────────────────────────
// Socket & Server Stubs (Server-side types)
// ─────────────────────────────────────────────────────────────

interface SocketStub {
  data: { userId: string };
  emit: (event: string, payload: unknown) => void;
}

interface ServerStub {
  to: (room: string) => {
    emit: (event: string, payload: unknown) => void;
  };
}

// ─────────────────────────────────────────────────────────────
// Handler registration (call this in your server index.ts)
// ─────────────────────────────────────────────────────────────

/**
 * Pseudocode handler registration pattern.
 * Actual DB calls use your server's Supabase admin client.
 *
 * function registerBreakoutHandlers(io: Server, socket: Socket) {
 *   socket.on(SOCKET_EVENTS.BREAKOUT_START_REQ, (payload) =>
 *     handleBreakoutStart(io, socket, payload));
 *   ...
 * }
 */

// ─────────────────────────────────────────────────────────────
// Handler: Start Breakout
// ─────────────────────────────────────────────────────────────

/**
 * Event: breakout:start
 * Expected payload: { orgId, breakoutId }
 *
 * Server flow:
 *   1. Verify actor is OWNER of org (DB lookup)
 *   2. Fetch breakout (host_id, status) from DB
 *   3. Policy check: START_BREAKOUT
 *   4. Update breakout status → LIVE
 *   5. Broadcast to org room
 *   6. Audit if ULTRA_SECURE
 */
export async function handleBreakoutStart(
  io: ServerStub,
  socket: SocketStub,
  payload: { orgId: string; breakoutId: string },
  deps: ServerDeps
): Promise<void> {
  const { userId } = socket.data;
  const { orgId, breakoutId } = payload;

  // Step 1: resolve actor role (DB — never trust client)
  const actorRole = await deps.resolveActorRole(userId, orgId, breakoutId);

  // Step 2: fetch breakout state
  const breakout = (await deps.getBreakout(breakoutId)) as BreakoutSession;
  const org = (await deps.getOrg(orgId)) as Organization;
  const effectiveMode = resolveEffectiveModeServer(org.mode, breakout.mode_override);

  // Step 3: policy check
  const check = resolvePolicyForAction(
    org.mode,
    breakout.mode_override,
    'START_BREAKOUT',
    actorRole,
    {
      hasHost: !!breakout.host_id,
      breakoutStatus: breakout.status,
    }
  );

  if (!check.allowed) {
    await emitDenial(socket, deps, {
      orgId,
      breakoutId,
      userId,
      effectiveMode,
      action: 'START_BREAKOUT',
      auditCode: check.auditCode!,
      reason: check.reason!,
    });
    return;
  }

  // Step 4: execute
  await deps.updateBreakoutStatus(breakoutId, 'LIVE');

  // Step 5: broadcast
  io.to(SOCKET_ROOMS.org(orgId)).emit(SOCKET_EVENTS.BREAKOUT_STARTED, {
    breakoutId,
    orgId,
  });

  // Step 6: audit
  if (requiresAuditLog(effectiveMode)) {
    await deps.auditLog(orgId, userId, 'BREAKOUT_STARTED', { breakoutId }, effectiveMode);
  }
}

// ─────────────────────────────────────────────────────────────
// Handler: Mode Switch (GAP 4 — server-side guard)
// ─────────────────────────────────────────────────────────────

/**
 * Event: org:mode-switch
 * Expected payload: { orgId, newMode }
 *
 * Server flow:
 *   1. Verify actor is OWNER
 *   2. DB check for LIVE breakouts (not client claim)
 *   3. Policy check: MODE_SWITCH
 *   4. Update org mode in DB
 *   5. Broadcast new mode to org room
 *   6. Audit the change (ULTRA only — but denials always logged)
 */
export async function handleModeSwitch(
  io: ServerStub,
  socket: SocketStub,
  payload: { orgId: string; newMode: OrgMode },
  deps: ServerDeps
): Promise<void> {
  const { userId } = socket.data;
  const { orgId, newMode } = payload;

  const actorRole = await deps.resolveActorRole(userId, orgId);
  const org = (await deps.getOrg(orgId)) as Organization;
  const liveBreakouts = await deps.getLiveBreakouts(orgId);

  const check = resolvePolicyForAction(org.mode, null, 'MODE_SWITCH', actorRole, {
    hasLiveBreakouts: liveBreakouts.length > 0,
  });

  if (!check.allowed) {
    await emitDenial(socket, deps, {
      orgId,
      userId,
      effectiveMode: org.mode,
      action: 'MODE_SWITCH',
      auditCode: check.auditCode!,
      reason: check.reason!,
    });
    return;
  }

  await deps.updateOrgMode(orgId, newMode);

  io.to(SOCKET_ROOMS.org(orgId)).emit(SOCKET_EVENTS.ORG_MODE_CHANGED, {
    orgId,
    newMode,
  });

  // Always audit mode switches in ULTRA
  if (newMode === 'ULTRA_SECURE' || org.mode === 'ULTRA_SECURE') {
    await deps.auditLog(orgId, userId, 'MODE_SWITCHED', { from: org.mode, to: newMode }, newMode);
  }
}

// ─────────────────────────────────────────────────────────────
// Handler: Host Disconnect (GAP 5 — host failure policy)
// ─────────────────────────────────────────────────────────────

/**
 * Called from: socket.on('disconnect') handler on the server.
 * Applies host failure policy per mode.
 */
export async function handleHostDisconnect(
  io: ServerStub,
  userId: string,
  deps: ServerDeps
): Promise<void> {
  // Find all LIVE breakouts where this user is the host
  const hostingBreakouts = await deps.getActiveBreakoutsHostedBy(userId);

  for (const breakout of hostingBreakouts) {
    const org = (await deps.getOrg(breakout.organization_id)) as Organization;
    const effectiveMode = resolveEffectiveModeServer(org.mode, breakout.mode_override);
    const failurePolicy = getHostFailurePolicy(effectiveMode);

    if (failurePolicy.action === 'PAUSE') {
      // Immediate pause — ULTRA_SECURE
      await deps.updateBreakoutStatus(breakout.id, 'PAUSED');

      io.to(SOCKET_ROOMS.breakout(breakout.id)).emit(SOCKET_EVENTS.BREAKOUT_PAUSED, {
        breakoutId: breakout.id,
        reason: 'HOST_DISCONNECTED',
        requiresOwnerIntervention: failurePolicy.requireOwnerIntervention,
        bannerMessage: failurePolicy.bannerMessage,
      });

      // Notify owner privately
      if (failurePolicy.notifyOwner) {
        io.to(SOCKET_ROOMS.orgOwner(breakout.organization_id)).emit(
          SOCKET_EVENTS.HOST_DISCONNECTED_ALERT,
          {
            breakoutId: breakout.id,
            breakoutName: breakout.name,
          }
        );
      }

      // Audit the pause (ULTRA always)
      await deps.auditLog(
        breakout.organization_id,
        userId,
        'BREAKOUT_PAUSED',
        { reason: 'HOST_DISCONNECTED', breakoutId: breakout.id },
        effectiveMode
      );
    } else {
      // CONTINUE — FUN/PROF
      io.to(SOCKET_ROOMS.breakout(breakout.id)).emit(SOCKET_EVENTS.BREAKOUT_STATE_UPDATED, {
        breakoutId: breakout.id,
        hostDisconnected: true,
        bannerMessage: failurePolicy.bannerMessage,
      });

      // PROF: notify owner after grace period
      if (failurePolicy.notifyOwner && failurePolicy.gracePeriodMs > 0) {
        setTimeout(() => {
          io.to(SOCKET_ROOMS.orgOwner(breakout.organization_id)).emit(
            SOCKET_EVENTS.HOST_ABSENT_WARNING,
            {
              breakoutId: breakout.id,
              gracePeriodMs: failurePolicy.gracePeriodMs,
            }
          );
        }, failurePolicy.gracePeriodMs);
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Helper: emit policy denial + log to audit
// ─────────────────────────────────────────────────────────────

interface DenialContext {
  orgId: string;
  breakoutId?: string;
  userId: string;
  effectiveMode: string;
  action: string;
  auditCode: string;
  reason: string;
}

async function emitDenial(socket: SocketStub, deps: ServerDeps, ctx: DenialContext): Promise<void> {
  const payload: PolicyDeniedPayload = {
    action: ctx.action,
    auditCode: ctx.auditCode,
    reason: ctx.reason,
    wasAudited: ALWAYS_AUDIT_DENIAL,
  };

  socket.emit(SOCKET_EVENTS.POLICY_DENIED, payload);

  // POLICY_DENIED is ALWAYS logged — regardless of mode
  if (ALWAYS_AUDIT_DENIAL) {
    await deps.auditLog(
      ctx.orgId,
      ctx.userId,
      'POLICY_DENIED',
      {
        action: ctx.action,
        auditCode: ctx.auditCode,
        reason: ctx.reason,
        breakoutId: ctx.breakoutId,
      },
      ctx.effectiveMode as OrgMode
    );
  }
}

// ─────────────────────────────────────────────────────────────
// Server dependency injection interface
// ─────────────────────────────────────────────────────────────
// Wire these to your actual server DB/service calls.

export interface ServerDeps {
  resolveActorRole(userId: string, orgId: string, breakoutId?: string): Promise<BreakoutActorRole>;
  getOrg(orgId: string): Promise<Organization | null>;
  getBreakout(breakoutId: string): Promise<BreakoutSession | null>;
  getLiveBreakouts(orgId: string): Promise<BreakoutSession[]>;
  getActiveBreakoutsHostedBy(userId: string): Promise<BreakoutSession[]>;
  updateBreakoutStatus(breakoutId: string, status: string): Promise<void>;
  updateOrgMode(orgId: string, mode: OrgMode): Promise<void>;
  auditLog(
    orgId: string,
    actorId: string,
    action: string,
    payload: Record<string, unknown>,
    mode: OrgMode,
    breakoutId?: string
  ): Promise<void>;
}
