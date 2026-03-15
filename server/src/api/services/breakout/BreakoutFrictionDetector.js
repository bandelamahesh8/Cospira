/**
 * BreakoutFrictionDetector.js — Process Friction Detection
 * ─────────────────────────────────────────────────────────
 * Capability 10: Detects when policy denials signal a UX-policy mismatch.
 *
 * Example: PROF org gets 15 denials for "self-move" (allowed in FUN)
 * → suggests mode review.
 *
 * This is product intelligence — no user surveillance.
 */

import logger from '../../logger.js';
import { AI_INSIGHT_TYPES } from './BreakoutAIPolicy.js';
// ingest passed as parameter — not imported statically — to break circular deps

// Per-org denial buckets (audit_code → count)
const frictionBuckets = new Map(); // orgId → Map<auditCode, count>
const FRICTION_THRESHOLD = 10; // denials of same type before surfacing insight
const MODES_TO_FIX = {
  'START_NO_HOST': { suggestion: 'Ensure hosts are assigned before starting breakouts. Consider automating host assignment.' },
  'RESUME_NO_HOST': { suggestion: 'When sessions pause due to host disconnect, pre-assign a backup host.' },
  'MODE_SWITCH_LIVE_BREAKOUTS': { suggestion: 'Users are repeatedly trying to switch mode during live sessions. Consider a scheduled mode transition workflow.' },
  // Self-move related — FUN vs PROF mismatch
  'ASSIGN_HOST_NOT_OWNER': { suggestion: 'Multiple users attempting host assignment — consider delegating via a co-owner role.' },
};

class BreakoutFrictionDetector {
  async process(event, policy, io, ingest) {
    const { type, orgId, breakoutId, payload } = event;
    if (type !== 'POLICY_DENIED' || !payload?.auditCode) return;

    try {
      const { auditCode, action } = payload;

      // Track denials per org per audit code
      if (!frictionBuckets.has(orgId)) frictionBuckets.set(orgId, new Map());
      const bucket = frictionBuckets.get(orgId);
      bucket.set(auditCode, (bucket.get(auditCode) ?? 0) + 1);

      const count = bucket.get(auditCode);
      const template = MODES_TO_FIX[auditCode];

      if (count >= FRICTION_THRESHOLD && template) {
        const insight = {
          insight: `"${action}" has been denied ${count} times in this org — suggesting a configuration or mode mismatch.`,
          recommendation: template.suggestion,
          auditCode,
          denialCount: count,
        };

        await ingest.writeInsight({
          orgId,
          breakoutId,
          type: AI_INSIGHT_TYPES.FRICTION_SIGNAL,
          mode: policy.requireAuditLog ? 'ULTRA_SECURE' : 'PROF',
          content: insight,
          confidence: 0.75,
        });

        // Reset to avoid repeated identical signals
        bucket.set(auditCode, 0);
        logger.info(`[BreakoutFrictionDetector] Friction signal for org ${orgId}: ${auditCode}`);
      }
    } catch (err) {
      logger.error('[BreakoutFrictionDetector] process error:', err.message);
    }
  }
}

export default new BreakoutFrictionDetector();
