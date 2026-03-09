/**
 * BreakoutPolicyEngine
 * ─────────────────────────────────────────────────────────────
 * SERVER-AUTHORITATIVE policy enforcement layer.
 *
 * This file is intentionally free of any React/browser dependencies
 * so it can be copy-pasted verbatim into the server (Node.js).
 *
 * RULE: Client uses ModePolicyResolver for UX guard.
 *        Server uses BreakoutPolicyEngine as LAW.
 *        Both must agree — but server always wins.
 */

import { OrgMode } from '@/types/organization';

// ─────────────────────────────────────────────────────────────
// Actor Roles (server-resolved — never trust client payload)
// ─────────────────────────────────────────────────────────────

export type BreakoutActorRole = 'OWNER' | 'HOST' | 'PARTICIPANT' | 'OBSERVER';

// ─────────────────────────────────────────────────────────────
// Actions that require server-side policy check
// ─────────────────────────────────────────────────────────────

export type BreakoutAction =
  | 'CREATE_BREAKOUT'
  | 'START_BREAKOUT'
  | 'CLOSE_BREAKOUT'
  | 'PAUSE_BREAKOUT'
  | 'RESUME_BREAKOUT'
  | 'ASSIGN_HOST'
  | 'ASSIGN_PARTICIPANT'
  | 'REMOVE_PARTICIPANT'
  | 'HOST_REASSIGN'
  | 'PARTICIPANT_MOVE'
  | 'OWNER_JOIN'
  | 'MODE_SWITCH'
  | 'VIEW_AUDIT_LOG';

// ─────────────────────────────────────────────────────────────
// Policy check result
// ─────────────────────────────────────────────────────────────

export interface PolicyCheckResult {
  allowed: boolean;
  reason?: string; // Human-readable denial reason (logged to audit)
  auditCode?: string; // Machine-readable code for audit table
}

// ─────────────────────────────────────────────────────────────
// Server-side mode resolution (mirrors ModePolicyResolver)
// No browser/React deps — pure functions only
// ─────────────────────────────────────────────────────────────

export function resolveEffectiveModeServer(
  orgMode: OrgMode,
  modeOverride?: OrgMode | null
): Exclude<OrgMode, 'MIXED'> {
  if (orgMode === 'MIXED') {
    if (modeOverride && modeOverride !== 'MIXED') {
      return modeOverride as Exclude<OrgMode, 'MIXED'>;
    }
    return 'FUN'; // Conservative MIXED default
  }
  return orgMode as Exclude<OrgMode, 'MIXED'>;
}

// ─────────────────────────────────────────────────────────────
// Policy table (server-side, must match ModePolicyResolver)
// ─────────────────────────────────────────────────────────────

interface ServerPolicyProfile {
  canParticipantRequestMove: boolean;
  canHostReassignParticipant: boolean;
  canOwnerJoinSilently: boolean;
  mandatoryRecording: boolean;
  identityEnforced: boolean;
  requiresImmutableAudit: boolean;
}

const SERVER_POLICIES: Record<Exclude<OrgMode, 'MIXED'>, ServerPolicyProfile> = {
  FUN: {
    canParticipantRequestMove: true,
    canHostReassignParticipant: true,
    canOwnerJoinSilently: true,
    mandatoryRecording: false,
    identityEnforced: false,
    requiresImmutableAudit: false,
  },
  PROF: {
    canParticipantRequestMove: false,
    canHostReassignParticipant: false,
    canOwnerJoinSilently: true,
    mandatoryRecording: false,
    identityEnforced: true,
    requiresImmutableAudit: false,
  },
  ULTRA_SECURE: {
    canParticipantRequestMove: false,
    canHostReassignParticipant: false,
    canOwnerJoinSilently: false,
    mandatoryRecording: true,
    identityEnforced: true,
    requiresImmutableAudit: true,
  },
};

export function getServerPolicy(mode: Exclude<OrgMode, 'MIXED'>): ServerPolicyProfile {
  return SERVER_POLICIES[mode];
}

// ─────────────────────────────────────────────────────────────
// Core policy check — used by every socket handler
// ─────────────────────────────────────────────────────────────

export function resolvePolicyForAction(
  orgMode: OrgMode,
  modeOverride: OrgMode | null | undefined,
  action: BreakoutAction,
  actorRole: BreakoutActorRole,
  context?: {
    hasHost?: boolean; // START_BREAKOUT: requires host assigned
    hasLiveBreakouts?: boolean; // MODE_SWITCH: blocked if true
    breakoutStatus?: string; // PAUSE/RESUME: requires correct current status
  }
): PolicyCheckResult {
  const effectiveMode = resolveEffectiveModeServer(orgMode, modeOverride);
  const policy = getServerPolicy(effectiveMode);

  switch (action) {
    case 'CREATE_BREAKOUT':
      if (actorRole !== 'OWNER')
        return deny('CREATE_BREAKOUT_NOT_OWNER', 'Only org owner can create breakouts');
      return allow();

    case 'START_BREAKOUT':
      if (actorRole !== 'OWNER')
        return deny('START_BREAKOUT_NOT_OWNER', 'Only org owner can start breakouts');
      if (!context?.hasHost)
        return deny('START_BREAKOUT_NO_HOST', 'Cannot start breakout: no host assigned');
      if (context?.breakoutStatus !== 'CREATED')
        return deny('START_BREAKOUT_WRONG_STATUS', 'Breakout must be in CREATED state to start');
      return allow();

    case 'CLOSE_BREAKOUT':
      if (actorRole !== 'OWNER')
        return deny('CLOSE_BREAKOUT_NOT_OWNER', 'Only org owner can close breakouts');
      if (context?.breakoutStatus === 'CLOSED')
        return deny('CLOSE_BREAKOUT_ALREADY_CLOSED', 'Breakout is already closed');
      return allow();

    case 'PAUSE_BREAKOUT':
      if (actorRole !== 'OWNER')
        return deny('PAUSE_BREAKOUT_NOT_OWNER', 'Only org owner can pause breakouts');
      if (context?.breakoutStatus !== 'LIVE')
        return deny('PAUSE_BREAKOUT_NOT_LIVE', 'Only LIVE breakouts can be paused');
      return allow();

    case 'RESUME_BREAKOUT':
      if (actorRole !== 'OWNER')
        return deny('RESUME_BREAKOUT_NOT_OWNER', 'Only org owner can resume breakouts');
      if (context?.breakoutStatus !== 'PAUSED')
        return deny('RESUME_BREAKOUT_NOT_PAUSED', 'Only PAUSED breakouts can be resumed');
      return allow();

    case 'ASSIGN_HOST':
    case 'ASSIGN_PARTICIPANT':
      if (actorRole !== 'OWNER')
        return deny('ASSIGN_NOT_OWNER', `Only org owner can perform ${action}`);
      return allow();

    case 'REMOVE_PARTICIPANT':
      if (actorRole !== 'OWNER' && actorRole !== 'HOST') {
        return deny('REMOVE_NOT_AUTHORIZED', 'Only owner or host can remove participants');
      }
      return allow();

    case 'HOST_REASSIGN':
      if (actorRole !== 'HOST' && actorRole !== 'OWNER') {
        return deny('HOST_REASSIGN_NOT_AUTHORIZED', 'Only host or owner can reassign participants');
      }
      if (actorRole === 'HOST' && !policy.canHostReassignParticipant) {
        return deny(
          'HOST_REASSIGN_POLICY_BLOCKED',
          `Host cannot reassign participants in ${effectiveMode} mode`
        );
      }
      return allow();

    case 'PARTICIPANT_MOVE':
      if (actorRole === 'OWNER') return allow(); // Owner can always move
      if (actorRole !== 'PARTICIPANT')
        return deny('PARTICIPANT_MOVE_WRONG_ROLE', 'Only participants can self-request moves');
      if (!policy.canParticipantRequestMove) {
        return deny(
          'PARTICIPANT_MOVE_POLICY_BLOCKED',
          `Participants cannot self-move in ${effectiveMode} mode`
        );
      }
      return allow();

    case 'OWNER_JOIN':
      // Owner can always enter — silent join is not a permission, it's a UI signal
      if (actorRole !== 'OWNER') return deny('OWNER_JOIN_NOT_OWNER', 'Not the org owner');
      return allow();

    case 'MODE_SWITCH':
      if (actorRole !== 'OWNER')
        return deny('MODE_SWITCH_NOT_OWNER', 'Only org owner can switch mode');
      if (context?.hasLiveBreakouts) {
        return deny(
          'MODE_SWITCH_LIVE_BREAKOUTS',
          'Cannot switch mode while LIVE breakouts exist — close all active sessions first'
        );
      }
      return allow();

    case 'VIEW_AUDIT_LOG':
      if (actorRole !== 'OWNER')
        return deny('AUDIT_LOG_NOT_OWNER', 'Only org owner can view audit logs');
      return allow();

    default:
      return deny('UNKNOWN_ACTION', `Unknown action: ${action}`);
  }
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function allow(): PolicyCheckResult {
  return { allowed: true };
}

function deny(auditCode: string, reason: string): PolicyCheckResult {
  return { allowed: false, auditCode, reason };
}

// ─────────────────────────────────────────────────────────────
// Audit requirement check
// ─────────────────────────────────────────────────────────────

/**
 * Returns true if the given mode requires immutable audit logging.
 * Call this after every action to decide whether to write to audit table.
 */
export function requiresAuditLog(mode: OrgMode): boolean {
  if (mode === 'MIXED') return false; // Per-breakout decision
  if (mode === 'ULTRA_SECURE') return true;
  return false;
}

/**
 * Every POLICY_DENIED event is logged regardless of mode.
 * This catches attempted policy violations across all modes.
 */
export const ALWAYS_AUDIT_DENIAL = true;
