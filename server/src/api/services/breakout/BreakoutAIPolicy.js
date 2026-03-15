/**
 * BreakoutAIPolicy.js — Mode-Aware AI Permission Gate
 * ─────────────────────────────────────────────────────
 * Pure function — no side effects, no DB calls.
 *
 * Every AI processor MUST call getAIPolicy(effectiveMode)
 * and check the relevant flag before processing.
 *
 * Rule: if policy denies → event is silently discarded.
 * No exceptions, no fallback processing.
 */

/**
 * @typedef {Object} AIPolicy
 * @property {boolean} allowChatAnalysis       - May AI read chat content?
 * @property {boolean} allowVoiceAnalysis      - May AI process voice/transcripts?
 * @property {boolean} allowRawRetention       - May raw content be retained? ALWAYS false.
 * @property {boolean} allowSummaryPersistence - May summaries be stored in ai_insights?
 * @property {boolean} requireAuditLog         - Must AI actions be written to ai_audit_events?
 * @property {boolean} requireConsent          - Is explicit consent required before processing?
 * @property {string}  moderationMode          - 'ADVISORY' (all modes — AI never auto-acts)
 */

const AI_POLICIES = {
  FUN: {
    allowChatAnalysis: true,
    allowVoiceAnalysis: true,
    allowRawRetention: false,       // NEVER
    allowSummaryPersistence: false, // FUN sessions not retained
    requireAuditLog: false,
    requireConsent: false,
    moderationMode: 'ADVISORY',
  },
  PROF: {
    allowChatAnalysis: true,
    allowVoiceAnalysis: true,
    allowRawRetention: false,       // NEVER
    allowSummaryPersistence: true,
    requireAuditLog: false,
    requireConsent: false,
    moderationMode: 'ADVISORY',
  },
  ULTRA_SECURE: {
    allowChatAnalysis: true,        // Derived insights only — no raw content
    allowVoiceAnalysis: true,       // Requires explicit consent flag
    allowRawRetention: false,       // NEVER — derived insights only
    allowSummaryPersistence: true,  // Summaries stored (derived, no verbatim quotes)
    requireAuditLog: true,          // Every AI action must be logged
    requireConsent: true,           // Voice transcription requires explicit consent
    moderationMode: 'ADVISORY',
  },
  MIXED: {
    // MIXED defers to the per-breakout mode_override.
    // If no override: use PROF as conservative default.
    allowChatAnalysis: true,
    allowVoiceAnalysis: true,
    allowRawRetention: false,
    allowSummaryPersistence: true,
    requireAuditLog: false,
    requireConsent: false,
    moderationMode: 'ADVISORY',
  },
};

/**
 * Get AI policy for an effective mode.
 * @param {string} effectiveMode - 'FUN' | 'PROF' | 'ULTRA_SECURE' | 'MIXED'
 * @returns {AIPolicy}
 */
export function getAIPolicy(effectiveMode) {
  return AI_POLICIES[effectiveMode] ?? AI_POLICIES.PROF;
}

/**
 * Check whether a specific AI capability is allowed in this mode.
 *
 * @param {string} effectiveMode
 * @param {'chat' | 'voice' | 'summary' | 'audit'} capability
 * @param {{ hasConsent?: boolean }} context
 * @returns {{ allowed: boolean, reason?: string }}
 */
export function checkAICapability(effectiveMode, capability, context = {}) {
  const policy = getAIPolicy(effectiveMode);

  switch (capability) {
    case 'chat':
      if (!policy.allowChatAnalysis) {
        return { allowed: false, reason: `Chat analysis not allowed in ${effectiveMode} mode` };
      }
      return { allowed: true };

    case 'voice':
      if (!policy.allowVoiceAnalysis) {
        return { allowed: false, reason: `Voice analysis not allowed in ${effectiveMode} mode` };
      }
      if (policy.requireConsent && !context.hasConsent) {
        return { allowed: false, reason: 'ULTRA mode: voice analysis requires explicit consent flag' };
      }
      return { allowed: true };

    case 'summary':
      if (!policy.allowSummaryPersistence) {
        return { allowed: false, reason: `Summary persistence not allowed in ${effectiveMode} mode` };
      }
      return { allowed: true };

    case 'audit':
      return { allowed: policy.requireAuditLog };

    default:
      return { allowed: false, reason: `Unknown capability: ${capability}` };
  }
}

/**
 * Determine which AI insight types are enabled per mode.
 * Processors use this to gate themselves without importing policy per-capability.
 */
export const AI_INSIGHT_TYPES = {
  MODERATION_FLAG: 'MODERATION_FLAG',
  ASSIGNMENT_SUGGESTION: 'ASSIGNMENT_SUGGESTION',
  SESSION_SUMMARY: 'SESSION_SUMMARY',
  ENGAGEMENT_ALERT: 'ENGAGEMENT_ALERT',
  RISK_ALERT: 'RISK_ALERT',
  FRICTION_SIGNAL: 'FRICTION_SIGNAL',
  HOST_BRIEF: 'HOST_BRIEF',
  POST_MORTEM: 'POST_MORTEM',
  GOVERNANCE_EXPLAIN: 'GOVERNANCE_EXPLAIN',
  POLICY_DRIFT: 'POLICY_DRIFT',
  ORG_TRUST_UPDATE: 'ORG_TRUST_UPDATE',
  ONBOARDING_ADVICE: 'ONBOARDING_ADVICE',
  CAPACITY_ALERT: 'CAPACITY_ALERT',
};
