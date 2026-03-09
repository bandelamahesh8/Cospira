import { OrgMode, Organization, BreakoutSession } from '@/types/organization';

// ─────────────────────────────────────────────────────────────
// Policy Profile
// Every dimension of behavior derives from here — never hardcode
// per-screen logic.
// ─────────────────────────────────────────────────────────────

export interface PolicyProfile {
  mode: OrgMode;

  // Permissions
  canParticipantRequestMove: boolean;
  canHostReassignParticipant: boolean;
  canOwnerJoinSilently: boolean;
  mandatoryRecording: boolean;
  identityEnforced: boolean;
  allowNicknames: boolean;

  // Logging & audit
  auditLevel: 'minimal' | 'moderate' | 'immutable';
  appendOnlyAudit: boolean; // ULTRA_SECURE only

  // UI adaptation signals (consumed by components)
  ui: {
    showComplianceBanner: boolean;
    lockParticipantControls: boolean;
    blockNicknameChange: boolean;
    showReactions: boolean; // FUN only
    showHostPresenceIndicator: boolean; // PROF + ULTRA
    modeBadgeColor: string; // Tailwind color class
    modeBadgeLabel: string;
    modeEmoji: string;
  };
}

// ─────────────────────────────────────────────────────────────
// Policy Definitions (final, non-negotiable)
// ─────────────────────────────────────────────────────────────

const POLICIES: Record<Exclude<OrgMode, 'MIXED'>, PolicyProfile> = {
  FUN: {
    mode: 'FUN',
    canParticipantRequestMove: true,
    canHostReassignParticipant: true,
    canOwnerJoinSilently: true,
    mandatoryRecording: false,
    identityEnforced: false,
    allowNicknames: true,
    auditLevel: 'minimal',
    appendOnlyAudit: false,
    ui: {
      showComplianceBanner: false,
      lockParticipantControls: false,
      blockNicknameChange: false,
      showReactions: true,
      showHostPresenceIndicator: false,
      modeBadgeColor:
        'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]',
      modeBadgeLabel: 'FUN',
      modeEmoji: '🟢',
    },
  },

  PROF: {
    mode: 'PROF',
    canParticipantRequestMove: false,
    canHostReassignParticipant: false,
    canOwnerJoinSilently: true,
    mandatoryRecording: false,
    identityEnforced: true,
    allowNicknames: false,
    auditLevel: 'moderate',
    appendOnlyAudit: false,
    ui: {
      showComplianceBanner: false,
      lockParticipantControls: true,
      blockNicknameChange: true,
      showReactions: false,
      showHostPresenceIndicator: true,
      modeBadgeColor:
        'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]',
      modeBadgeLabel: 'PROFESSIONAL',
      modeEmoji: '🔵',
    },
  },

  ULTRA_SECURE: {
    mode: 'ULTRA_SECURE',
    canParticipantRequestMove: false,
    canHostReassignParticipant: false,
    canOwnerJoinSilently: false, // Even owner is visible
    mandatoryRecording: true,
    identityEnforced: true,
    allowNicknames: false,
    auditLevel: 'immutable',
    appendOnlyAudit: true,
    ui: {
      showComplianceBanner: true,
      lockParticipantControls: true,
      blockNicknameChange: true,
      showReactions: false,
      showHostPresenceIndicator: true,
      modeBadgeColor:
        'bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.15)] scanlines',
      modeBadgeLabel: 'ULTRA SECURE',
      modeEmoji: '🔴',
    },
  },
};

// MIXED policy is a pass-through — resolved per breakout
const MIXED_UI = {
  showComplianceBanner: false,
  lockParticipantControls: false,
  blockNicknameChange: false,
  showReactions: false,
  showHostPresenceIndicator: true,
  modeBadgeColor:
    'bg-purple-500/10 text-purple-400 border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.1)]',
  modeBadgeLabel: 'MIXED',
  modeEmoji: '🟣',
};

// ─────────────────────────────────────────────────────────────
// ModePolicyResolver — THE single source of truth
// ─────────────────────────────────────────────────────────────

export class ModePolicyResolver {
  /**
   * Resolve the effective mode for a given context.
   * For MIXED orgs, the breakout's mode_override wins.
   * effectiveMode = breakout.mode_override ?? organization.mode
   */
  static resolveEffectiveMode(
    org: Pick<Organization, 'mode'>,
    breakout?: Pick<BreakoutSession, 'mode_override'> | null
  ): Exclude<OrgMode, 'MIXED'> {
    if (org.mode === 'MIXED') {
      if (breakout?.mode_override && breakout.mode_override !== 'MIXED') {
        return breakout.mode_override as Exclude<OrgMode, 'MIXED'>;
      }
      // MIXED with no override defaults to FUN
      return 'FUN';
    }
    return org.mode as Exclude<OrgMode, 'MIXED'>;
  }

  /**
   * Resolve a tactical policy specifically for a breakout/child room,
   * factoring in its Mode Override, Room Type, and Security Level.
   */
  static resolveBreakoutPolicy(
    org: Pick<Organization, 'mode'>,
    breakout: Pick<BreakoutSession, 'mode_override' | 'room_type' | 'security_level'>
  ): PolicyProfile {
    const baseMode = this.resolveEffectiveMode(org, breakout);
    const basePolicy = JSON.parse(JSON.stringify(this.getPolicy(baseMode))); // deep clone to avoid mutation

    // 1. Security Level Overrides
    switch (breakout.security_level) {
      case 'MANDATORY_RECORDING':
        basePolicy.mandatoryRecording = true;
        basePolicy.ui.showComplianceBanner = true;
        break;
      case 'ZERO_TRUST':
        basePolicy.identityEnforced = true;
        basePolicy.canParticipantRequestMove = false;
        basePolicy.canOwnerJoinSilently = false;
        basePolicy.ui.lockParticipantControls = true;
        basePolicy.auditLevel = 'immutable';
        break;
      case 'AI_OBSERVED':
        basePolicy.auditLevel = 'immutable';
        // Potential for more AI-specific flags here
        break;
    }

    // 2. Room Type Behavioral Tweaks
    switch (breakout.room_type) {
      case 'SECURE_VAULT':
        basePolicy.ui.lockParticipantControls = true;
        basePolicy.mandatoryRecording = true;
        basePolicy.allowNicknames = false;
        break;
      case 'AI_LAB':
        basePolicy.appendOnlyAudit = true;
        basePolicy.auditLevel = 'immutable';
        break;
      case 'COLLAB_HUB':
        basePolicy.canParticipantRequestMove = true;
        basePolicy.ui.showReactions = true; // Allow reactions even if base mode is PROF
        break;
    }

    return basePolicy;
  }

  /**
   * Get the full policy profile for a given resolved mode.
   */
  static getPolicy(mode: OrgMode): PolicyProfile {
    if (mode === 'MIXED') {
      // Return a placeholder for MIXED-level display (org header badge)
      return {
        mode: 'MIXED',
        canParticipantRequestMove: false,
        canHostReassignParticipant: false,
        canOwnerJoinSilently: true,
        mandatoryRecording: false,
        identityEnforced: false,
        allowNicknames: true,
        auditLevel: 'minimal',
        appendOnlyAudit: false,
        ui: MIXED_UI,
      };
    }
    return POLICIES[mode];
  }

  // ─── Convenience Permission Helpers ─────────────────────────

  static canParticipantMove(mode: OrgMode): boolean {
    return this.getPolicy(mode).canParticipantRequestMove;
  }

  static canHostReassign(mode: OrgMode): boolean {
    return this.getPolicy(mode).canHostReassignParticipant;
  }

  static canOwnerJoinSilently(mode: OrgMode): boolean {
    return this.getPolicy(mode).canOwnerJoinSilently;
  }

  static isMandatoryRecording(mode: OrgMode): boolean {
    return this.getPolicy(mode).mandatoryRecording;
  }

  static isIdentityEnforced(mode: OrgMode): boolean {
    return this.getPolicy(mode).identityEnforced;
  }

  static isImmutableAudit(mode: OrgMode): boolean {
    return this.getPolicy(mode).appendOnlyAudit;
  }

  /** Get the UI badge props for display in any component */
  static getBadge(mode: OrgMode): { color: string; label: string; emoji: string } {
    const { modeBadgeColor, modeBadgeLabel, modeEmoji } = this.getPolicy(mode).ui;
    return { color: modeBadgeColor, label: modeBadgeLabel, emoji: modeEmoji };
  }
}
