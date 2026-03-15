/**
 * BreakoutAssignmentAdvisor.js — AI Breakout Assignment Suggestions
 * ─────────────────────────────────────────────────────────────────
 * Capability 2: Suggests optimal participant distribution.
 *
 * NEVER auto-applies. Owner sees the suggestion and triggers normal action.
 *
 * Logic:
 *   - Load balancing: participants per breakout should be within 20% of average
 *   - Large breakoutss (>20 participants) flagged for splitting
 *   - Idle breakouts combined with under-capacity ones
 */

import logger from '../../logger.js';
import { AI_INSIGHT_TYPES } from './BreakoutAIPolicy.js';
// ingest passed as parameter — not imported statically — to break circular deps
import { supabase } from '../../supabase.js';

class BreakoutAssignmentAdvisor {
  async process(event, policy, io, ingest) {
    const { orgId, mode } = event;
    if (!orgId) return;

    try {
      // Fetch all LIVE and CREATED breakouts for this org with participant counts
      const { data: breakouts, error } = await supabase
        .from('breakout_sessions')
        .select('id, name, status, host_id, max_participants')
        .eq('organization_id', orgId)
        .in('status', ['LIVE', 'CREATED']);

      if (error || !breakouts?.length) return;

      // Get participant counts per breakout
      const { data: participantCounts } = await supabase
        .from('breakout_participants')
        .select('breakout_id')
        .in('breakout_id', breakouts.map((b) => b.id));

      const countMap = {};
      (participantCounts ?? []).forEach((p) => {
        countMap[p.breakout_id] = (countMap[p.breakout_id] ?? 0) + 1;
      });

      const enriched = breakouts.map((b) => ({
        ...b,
        participantCount: countMap[b.id] ?? 0,
      }));

      const suggestions = this._analyze(enriched);
      if (!suggestions.length) return;

      await ingest.writeInsight({
        orgId,
        type: AI_INSIGHT_TYPES.ASSIGNMENT_SUGGESTION,
        mode,
        content: {
          rationale: 'Based on current participant distribution across breakouts.',
          suggested_distribution: suggestions,
        },
        confidence: 0.7,
      });

      logger.info(`[BreakoutAssignmentAdvisor] ${suggestions.length} suggestion(s) for org ${orgId}`);
    } catch (err) {
      logger.error('[BreakoutAssignmentAdvisor] process error:', err.message);
    }
  }

  _analyze(breakouts) {
    const suggestions = [];
    const total = breakouts.reduce((sum, b) => sum + b.participantCount, 0);
    const avg = total / breakouts.length;

    breakouts.forEach((b) => {
      if (b.participantCount === 0 && b.status === 'LIVE') {
        suggestions.push({
          breakoutId: b.id,
          breakoutName: b.name,
          type: 'IDLE_BREAKOUT',
          suggestion: `"${b.name}" is LIVE but has 0 participants. Consider closing or reassigning.`,
        });
      } else if (b.participantCount > avg * 1.5 && b.max_participants && b.participantCount > b.max_participants * 0.85) {
        suggestions.push({
          breakoutId: b.id,
          breakoutName: b.name,
          type: 'OVERCROWDED',
          suggestion: `"${b.name}" is at ${b.participantCount} participants (${Math.round(b.participantCount / b.max_participants * 100)}% capacity). Consider splitting.`,
        });
      }
    });

    return suggestions;
  }
}

export default new BreakoutAssignmentAdvisor();
