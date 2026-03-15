/**
 * BreakoutPostMortem.js — AI Failure Post-Mortem Generator
 * ──────────────────────────────────────────────────────────
 * Capability 12: Triggered when a breakout closes after failure.
 *
 * Reads the audit log for the closed breakout, passes event
 * timeline to Gemini LLM, and generates a human-readable post-mortem.
 *
 * Triggers: breakout closed after status=PAUSED or after >1 pause event.
 *
 * ULTRA: ai_audit_events written. No raw content stored.
 */

import logger from '../../logger.js';
import { AI_INSIGHT_TYPES, checkAICapability } from './BreakoutAIPolicy.js';
// ingest passed as parameter — not imported statically — to break circular deps
import { supabase } from '../../supabase.js';
import llmService from '../ai/LLMService.js';

class BreakoutPostMortem {
  async process(event, policy, io, ingest) {
    const { orgId, breakoutId, payload, mode } = event;

    // Only run post-mortem if the session had a failure indicator
    if (!breakoutId) return;
    if (!payload?.hadPause && payload?.status !== 'CLOSED') return;

    try {
      // Fetch audit events for this breakout (last 200)
      const { data: auditEvents, error } = await supabase
        .from('breakout_audit_events')
        .select('action, actor_id, mode, created_at, audit_code, denial_reason')
        .eq('breakout_id', breakoutId)
        .order('created_at', { ascending: true })
        .limit(200);

      if (error || !auditEvents?.length) return;

      // Build timeline (anonymized — no raw content, only event types + timestamps)
      const timeline = auditEvents.map((e) => ({
        time: e.created_at,
        event: e.action,
        ...(e.audit_code ? { code: e.audit_code } : {}),
        ...(e.denial_reason ? { reason: e.denial_reason } : {}),
      }));

      // Only use verbatim content if policy allows (ULTRA: derived only)
      const summaryAllowed = checkAICapability(mode, 'summary').allowed;
      if (!summaryAllowed) return;

      // Ask LLM to generate the post-mortem
      const postMortem = await this._generatePostMortem(timeline, mode);
      if (!postMortem) return;

      await ingest.writeInsight({
        orgId,
        breakoutId,
        type: AI_INSIGHT_TYPES.POST_MORTEM,
        mode,
        content: postMortem,
        confidence: 0.7,
      });

      if (policy.requireAuditLog) {
        await ingest.writeAIAudit({
          orgId,
          aiAction: 'POST_MORTEM_GENERATED',
          model: 'gemini-1.5-flash',
          inputType: 'audit_timeline',
          output: postMortem,
        });
      }

      logger.info(`[BreakoutPostMortem] Post-mortem generated for breakout ${breakoutId}`);
    } catch (err) {
      logger.error('[BreakoutPostMortem] process error:', err.message);
    }
  }

  async _generatePostMortem(timeline, mode) {
    try {
      if (!llmService.model) return null;

      const isUltra = mode === 'ULTRA_SECURE';
      const timelineStr = timeline
        .map((t) => `[${t.time}] ${t.event}${t.code ? ` (${t.code})` : ''}${t.reason ? `: ${t.reason}` : ''}`)
        .join('\n');

      const prompt = `
You are an enterprise session analyst.
Analyze the following breakout session event timeline and provide a concise post-mortem.
${isUltra ? 'IMPORTANT: Do not include any verbatim quotes or personal identifiers. Derived insights only.' : ''}

Timeline:
${timelineStr}

Return ONLY valid JSON in this format:
{
  "timeline_summary": "...",
  "root_causes": ["cause 1", "cause 2"],
  "prevention_suggestions": ["suggestion 1", "suggestion 2"]
}
`;

      const result = await llmService.model.generateContent(prompt);
      const text = result.response.text().trim()
        .replace(/^```json\n?/, '').replace(/```\n?$/, '');

      return JSON.parse(text);
    } catch (err) {
      logger.error('[BreakoutPostMortem] LLM generation failed:', err.message);
      return null;
    }
  }
}

export default new BreakoutPostMortem();
