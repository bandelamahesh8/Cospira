/**
 * Host Failure Recovery Policy
 * ─────────────────────────────────────────────────────────────
 * Defines what happens when a breakout host disconnects.
 * Behavior is mode-driven — no hardcoding.
 *
 * Server uses this to decide:
 *   - How long to wait before acting (grace period)
 *   - Whether to pause the session or let it continue
 *   - Whether owner notification is required
 *   - Whether owner must actively resume
 *
 * Also used client-side to display correct messaging in PAUSED banners.
 */

import { OrgMode } from '@/types/organization';

// ─────────────────────────────────────────────────────────────
// Policy definition
// ─────────────────────────────────────────────────────────────

export interface HostFailurePolicy {
  /**
   * How long (ms) to wait before triggering the action.
   * 0 = immediate.
   */
  gracePeriodMs: number;

  /**
   * What to do after the grace period expires.
   * PAUSE: freeze the breakout (ULTRA_SECURE)
   * CONTINUE: session runs without host (FUN/PROF)
   */
  action: 'PAUSE' | 'CONTINUE';

  /**
   * Whether to send an owner notification.
   */
  notifyOwner: boolean;

  /**
   * Whether the owner must actively resume (PAUSE mode only).
   * If false, session auto-resumes when host reconnects.
   */
  requireOwnerIntervention: boolean;

  /**
   * Whether to auto-promote a participant to host.
   * Never true in ULTRA_SECURE (chain of custody).
   */
  autoReassignHost: boolean;

  /**
   * User-facing description of this policy (used in banners).
   */
  bannerMessage: string;
}

// ─────────────────────────────────────────────────────────────
// Policy table — one entry per concrete mode
// ─────────────────────────────────────────────────────────────

export const HOST_FAILURE_POLICIES: Record<Exclude<OrgMode, 'MIXED'>, HostFailurePolicy> = {
  FUN: {
    gracePeriodMs: 0,
    action: 'CONTINUE',
    notifyOwner: false,
    requireOwnerIntervention: false,
    autoReassignHost: false,
    bannerMessage: 'Host disconnected — session continues. They can rejoin at any time.',
  },

  PROF: {
    gracePeriodMs: 30_000, // 30 second grace period
    action: 'CONTINUE',
    notifyOwner: true,
    requireOwnerIntervention: false,
    autoReassignHost: false,
    bannerMessage: 'Host is temporarily away — session continues. Owner has been notified.',
  },

  ULTRA_SECURE: {
    gracePeriodMs: 0, // Immediate pause — no grace
    action: 'PAUSE',
    notifyOwner: true,
    requireOwnerIntervention: true,
    autoReassignHost: false, // Chain of custody — no auto-reassign
    bannerMessage:
      'ULTRA SECURE: Session paused because host disconnected. Owner must resume before continuing.',
  },
};

// ─────────────────────────────────────────────────────────────
// Resolver
// ─────────────────────────────────────────────────────────────

/**
 * Returns the host failure policy for the given effective mode.
 * MIXED defaults to PROF (conservative).
 */
export function getHostFailurePolicy(mode: OrgMode): HostFailurePolicy {
  if (mode === 'MIXED') return HOST_FAILURE_POLICIES.PROF;
  return HOST_FAILURE_POLICIES[mode as Exclude<OrgMode, 'MIXED'>];
}

/**
 * Returns true if the host disconnect should immediately pause the breakout.
 */
export function shouldPauseOnHostDisconnect(mode: OrgMode): boolean {
  return getHostFailurePolicy(mode).action === 'PAUSE';
}

/**
 * Returns the grace period in ms before acting on host disconnect.
 * 0 = immediate action.
 */
export function getHostGracePeriodMs(mode: OrgMode): number {
  return getHostFailurePolicy(mode).gracePeriodMs;
}

/**
 * Returns true if the owner must manually resume a paused breakout.
 * (As opposed to auto-resume when host reconnects.)
 */
export function requiresOwnerToResume(mode: OrgMode): boolean {
  return getHostFailurePolicy(mode).requireOwnerIntervention;
}
