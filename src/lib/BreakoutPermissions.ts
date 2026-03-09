import { Organization, BreakoutSession, OrgMode } from '@/types/organization';
import { ModePolicyResolver } from './ModePolicyResolver';

// ─────────────────────────────────────────────────────────────
// Centralized permission checks — NO scattered if-else in components
// Server is still authoritative; these are client-side guard rails
// ─────────────────────────────────────────────────────────────

interface MinimalUser {
  id: string;
}

export class BreakoutPermissions {
  // ─── Organization-level ───────────────────────────────────

  /**
   * Only the Org Owner can create breakouts.
   */
  static canCreateBreakout(user: MinimalUser, org: Organization): boolean {
    return org.owner_id === user.id;
  }

  /**
   * Only the Org Owner can assign a host to a breakout.
   */
  static canAssignHost(user: MinimalUser, org: Organization): boolean {
    return org.owner_id === user.id;
  }

  /**
   * Only the Org Owner can assign participants.
   */
  static canAssignParticipant(user: MinimalUser, org: Organization): boolean {
    return org.owner_id === user.id;
  }

  // ─── Breakout-level ───────────────────────────────────────

  /**
   * Only the Org Owner can start a breakout (transition to LIVE).
   * Requires at least 1 host to be assigned.
   */
  static canStartBreakout(
    user: MinimalUser,
    org: Organization,
    breakout: BreakoutSession
  ): boolean {
    if (org.owner_id !== user.id) return false;
    if (breakout.status !== 'CREATED') return false;
    if (!breakout.host_id) return false; // Must have a host
    return true;
  }

  /**
   * Org Owner can enter any breakout.
   * ULTRA_SECURE: Owner can still enter, but their join is NOT silent (visible to all).
   * Others: must be assigned to the breakout.
   */
  static canEnterBreakout(
    user: MinimalUser,
    org: Organization,
    breakout: BreakoutSession,
    _effectiveMode: Exclude<OrgMode, 'MIXED'>
  ): boolean {
    if (breakout.status === 'CLOSED') return false;

    // Org owner can always enter (visibility is a UI concern, not a permission concern)
    if (org.owner_id === user.id) return true;

    // Breakout host can enter their own breakout
    if (breakout.host_id === user.id) return true;

    // Regular participant — must be in the participant list
    return breakout.participants?.some((p) => p.user_id === user.id) ?? false;
  }

  /**
   * Participant can move themselves if mode policy allows.
   */
  static canParticipantSelfMove(
    user: MinimalUser,
    org: Organization,
    effectiveMode: Exclude<OrgMode, 'MIXED'>
  ): boolean {
    if (org.owner_id === user.id) return true; // Owner can always move
    return ModePolicyResolver.canParticipantMove(effectiveMode);
  }

  /**
   * Breakout Host can reassign participants within their own breakout (mode-dependent).
   */
  static canHostReassignInBreakout(
    user: MinimalUser,
    breakout: BreakoutSession,
    effectiveMode: Exclude<OrgMode, 'MIXED'>
  ): boolean {
    if (breakout.host_id !== user.id) return false;
    return ModePolicyResolver.canHostReassign(effectiveMode);
  }

  /**
   * Org Owner entering a breakout: is it a "silent" join?
   * (No notification sent to participants.)
   */
  static isOwnerJoinSilent(
    org: Organization,
    user: MinimalUser,
    effectiveMode: Exclude<OrgMode, 'MIXED'>
  ): boolean {
    if (org.owner_id !== user.id) return false;
    return ModePolicyResolver.canOwnerJoinSilently(effectiveMode);
  }

  // ─── Mode-switch guard ────────────────────────────────────

  /**
   * Mode switch is blocked if any breakout is LIVE.
   */
  static canSwitchMode(
    user: MinimalUser,
    org: Organization,
    breakouts: BreakoutSession[]
  ): boolean {
    if (org.owner_id !== user.id) return false;
    return !breakouts.some((b) => b.status === 'LIVE');
  }
}
