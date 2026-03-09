/**
 * Breakout Authority Rules
 * ─────────────────────────────────────────────────────────────
 * Explicit, code-enforced authority boundary for the breakout system.
 *
 * READ THIS BEFORE TOUCHING ANY BREAKOUT STATE.
 *
 * KEY RULE: Client state is a read-only REFLECTION of server-emitted events.
 *            NO exceptions.
 *
 * Violations of these rules cause:
 *   - Race conditions between optimistic UI and server truth
 *   - Security bypasses via crafted socket payloads
 *   - Audit log gaps (ULTRA mode risk)
 */

// ─────────────────────────────────────────────────────────────
// Authority ownership table
// ─────────────────────────────────────────────────────────────

type AuthorityOwner = 'SERVER' | 'CLIENT';

export const AUTHORITY: Record<string, AuthorityOwner> = {
  /** Breakout sessions list, status, host assignment */
  breakoutState: 'SERVER',

  /** User presence in lobby and breakout rooms */
  userPresence: 'SERVER',

  /** Mode enforcement (FUN/PROF/ULTRA_SECURE rules) */
  modeEnforcement: 'SERVER',

  /** Permission check results (canCreate, canStart, etc.) */
  permissionDecisions: 'SERVER',

  /** Audit log writes */
  auditLogWrites: 'SERVER',

  /**
   * UI rendering based on received server events.
   * Client is ONLY the renderer — never the decision-maker.
   */
  uiRendering: 'CLIENT',

  /**
   * UX guards — prevent obviously invalid actions in the UI.
   * These are convenience, NOT security. Server always re-checks.
   */
  uxGuards: 'CLIENT',
} as const;

// ─────────────────────────────────────────────────────────────
// Prohibited client-side patterns
// ─────────────────────────────────────────────────────────────

/**
 * THE FOLLOWING ARE STRICTLY FORBIDDEN CLIENT-SIDE:
 *
 * 1. OPTIMISTIC UPDATES for:
 *    - Breakout status changes (CREATED → LIVE → PAUSED → CLOSED)
 *    - Host assignment
 *    - Participant assignment / removal
 *    - Mode switch
 *
 * 2. TRUSTING CLIENT PAYLOAD for:
 *    - Actor role (always re-resolve from DB)
 *    - Org mode (always re-fetch from DB)
 *    - Breakout status (always re-fetch from DB)
 *
 * 3. BYPASSING SERVER for:
 *    - Any action that mutates breakout or org state
 *    - Mode switches
 *
 * ALLOWED:
 * - Showing loading spinners while waiting for server confirmation
 * - Disabling buttons based on locally-derived role (UX only)
 * - Displaying cached state from last server event
 */
export const PROHIBITED_PATTERNS = [
  'OPTIMISTIC_BREAKOUT_STATUS',
  'OPTIMISTIC_HOST_ASSIGN',
  'OPTIMISTIC_PARTICIPANT_ASSIGN',
  'OPTIMISTIC_MODE_SWITCH',
  'TRUST_CLIENT_ROLE',
  'TRUST_CLIENT_MODE',
  'BYPASS_SERVER_FOR_MUTATION',
] as const;

// ─────────────────────────────────────────────────────────────
// Pending action state type (use this in BreakoutContext)
// ─────────────────────────────────────────────────────────────

/**
 * Track in-flight actions waiting for server confirmation.
 * Show loading state on the UI, block double-submit.
 */
export interface PendingBreakoutAction {
  type: string; // e.g. 'START_BREAKOUT', 'MODE_SWITCH'
  breakoutId?: string;
  startedAt: number; // unix ms
  timeoutMs: number; // How long to wait before treating as failed
}

export const ACTION_TIMEOUT_MS: Record<string, number> = {
  START_BREAKOUT: 5_000,
  CLOSE_BREAKOUT: 5_000,
  PAUSE_BREAKOUT: 3_000,
  RESUME_BREAKOUT: 3_000,
  MODE_SWITCH: 5_000,
  ASSIGN_HOST: 4_000,
  ASSIGN_PARTICIPANT: 4_000,
  REMOVE_PARTICIPANT: 3_000,
} as const;

// ─────────────────────────────────────────────────────────────
// Dev-time assertion helper
// ─────────────────────────────────────────────────────────────

/**
 * Call this in dev mode to assert that you are NOT setting state
 * before server confirmation.
 *
 * Usage:
 *   assertNoOptimisticUpdate('START_BREAKOUT');
 *   // then emit socket event and wait for server response
 */
export function assertNoOptimisticUpdate(action: string): void {
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      `[AuthorityRules] ${action} — waiting for server confirmation. Not updating local state.`
    );
  }
}
