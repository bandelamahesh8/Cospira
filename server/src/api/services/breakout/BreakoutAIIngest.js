/**
 * BreakoutAIIngest.js — AI Event Ingest Queue
 * ─────────────────────────────────────────────
 * Reads server-emitted breakout events and routes them
 * to the appropriate AI processor.
 *
 * Rules (non-negotiable):
 *   1. Checks AIKillSwitch before processing EVERY event
 *   2. Checks mode-aware policy before routing to any processor
 *   3. AI crashing MUST NOT affect realtime — all processing is async/try-caught
 *   4. No raw content retention — payloads are stripped before storage
 *   5. AI never emits socket commands directly
 *
 * Architecture:
 *   breakout.socket.js ──▶ BreakoutAIIngest.enqueue()
 *                              │
 *                              ▼
 *                        AIKillSwitch.isEnabled?
 *                              │
 *                              ▼
 *                        getAIPolicy(mode)
 *                              │
 *                              ▼
 *                        Route to processor
 *                              │
 *                              ▼
 *                        writeInsight → Supabase ai_insights
 *                              │
 *                              ▼
 *                        io.to(ownerRoom).emit('ai:insight:new')
 */

import crypto from 'crypto';
import { supabase } from '../../../shared/supabase.js';
import logger from '../../../shared/logger.js';
import AIKillSwitch from './AIKillSwitch.js';
import { getAIPolicy, checkAICapability } from './BreakoutAIPolicy.js';

// Lazy-imported processors to avoid circular deps + allow crash isolation
async function getRiskDetector() { return (await import('./BreakoutRiskDetector.js')).default; }
async function getEngagementAnalyzer() { return (await import('./BreakoutEngagementAnalyzer.js')).default; }
async function getFrictionDetector() { return (await import('./BreakoutFrictionDetector.js')).default; }
async function getPostMortem() { return (await import('./BreakoutPostMortem.js')).default; }
async function getAssignmentAdvisor() { return (await import('./BreakoutAssignmentAdvisor.js')).default; }

class BreakoutAIIngest {
  constructor() {
    this._io = null;

    // Simple in-process queue (Redis Streams / BullMQ can replace this later)
    this._queue = [];
    this._processing = false;
    this._drainInterval = setInterval(() => this._drain(), 2000);
  }

  /**
   * Called once at server startup with the io instance.
   */
  init(io) {
    this._io = io;
    logger.info('[BreakoutAIIngest] Initialized');
  }

  /**
   * Enqueue a breakout event for AI processing.
   * Called directly from breakout.socket.js after every committed action.
   *
   * @param {Object} event
   * @param {string} event.type         - Event category (see AI_EVENT_TYPES below)
   * @param {string} event.orgId
   * @param {string} [event.breakoutId]
   * @param {string} event.mode         - effectiveMode at time of event
   * @param {Object} event.payload      - Immutable snapshot (no raw content)
   */
  enqueue(event) {
    // Synchronous kill check (cached) — fast path before async work
    if (!AIKillSwitch.isEnabledSync(event.orgId)) return;

    this._queue.push({
      ...event,
      event_id: crypto.randomUUID(),
      timestamp: Date.now(),
    });
  }

  /**
   * Drain the queue — processes events one at a time to avoid thundering herd.
   * Runs every 2s on an interval.
   */
  async _drain() {
    if (this._processing || this._queue.length === 0) return;
    this._processing = true;

    while (this._queue.length > 0) {
      const event = this._queue.shift();
      await this._processEvent(event).catch((err) => {
        logger.error(`[BreakoutAIIngest] Event processing failed (${event.type}):`, err.message);
        // Never re-throw — AI crash must not affect realtime
      });
    }

    this._processing = false;
  }

  /**
   * Route a single event to the appropriate processor.
   */
  async _processEvent(event) {
    const { type, orgId, breakoutId, mode, payload } = event;

    // Async kill check (accurate, DB-backed)
    if (!await AIKillSwitch.isEnabled(orgId)) return;

    const policy = getAIPolicy(mode);

    switch (type) {
      case AI_EVENT_TYPES.POLICY_DENIED:
      case AI_EVENT_TYPES.PAUSE_STORM: {
        const detector = await getRiskDetector();
        await detector.process(event, policy, this._io, this);
        break;
      }

      case AI_EVENT_TYPES.HOST_DISCONNECTED:
      case AI_EVENT_TYPES.STATE_SNAPSHOT: {
        // Route to both engagement and risk
        const [eng, risk] = await Promise.all([getEngagementAnalyzer(), getRiskDetector()]);
        await Promise.allSettled([
          eng.process(event, policy, this._io, this),
          risk.process(event, policy, this._io, this),
        ]);
        break;
      }

      case AI_EVENT_TYPES.BREAKOUT_CLOSED: {
        const pm = await getPostMortem();
        await pm.process(event, policy, this._io, this);
        break;
      }

      case AI_EVENT_TYPES.CHAT_MESSAGE: {
        if (!checkAICapability(mode, 'chat').allowed) return;
        const friction = await getFrictionDetector();
        await friction.process(event, policy, this._io, this);
        break;
      }

      case AI_EVENT_TYPES.PARTICIPANT_SNAPSHOT: {
        const advisor = await getAssignmentAdvisor();
        await advisor.process(event, policy, this._io, this);
        break;
      }

      default:
        // Unknown events are silently discarded
        break;
    }
  }

  /**
   * Write an AI insight to Supabase and notify the owner.
   * Called by processors — not called directly from socket handlers.
   *
   * @param {Object} opts
   * @param {string} opts.orgId
   * @param {string} [opts.breakoutId]
   * @param {string} opts.type          - AI_INSIGHT_TYPES constant
   * @param {string} opts.mode
   * @param {Object} opts.content       - Advisory output (no raw content)
   * @param {number} [opts.confidence]  - 0.0–1.0
   */
  async writeInsight({ orgId, breakoutId, type, mode, content, confidence }) {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from('ai_insights')
        .insert({
          org_id: orgId,
          breakout_id: breakoutId ?? null,
          type,
          mode,
          content,
          confidence: confidence ?? null,
        })
        .select('id')
        .single();

      if (error) throw error;

      // Notify owner in real-time (read-only push — no state mutation)
      if (this._io && data?.id) {
        this._io.to(`org:${orgId}:owner`).emit('ai:insight:new', {
          id: data.id,
          type,
          mode,
          content,
          confidence,
          breakoutId,
          createdAt: new Date().toISOString(),
        });
      }

      return data?.id ?? null;
    } catch (err) {
      logger.error('[BreakoutAIIngest] writeInsight failed:', err.message);
      return null;
    }
  }

  /**
   * Write an AI audit event (ULTRA only).
   * Called by processors when policy.requireAuditLog === true.
   */
  async writeAIAudit({ orgId, aiAction, model, inputType, output }) {
    if (!supabase) return;
    try {
      const outputHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(output))
        .digest('hex');

      await supabase.from('ai_audit_events').insert({
        org_id: orgId,
        ai_action: aiAction,
        model,
        input_type: inputType,
        output_hash: outputHash,
      });
    } catch (err) {
      logger.error('[BreakoutAIIngest] writeAIAudit failed:', err.message);
    }
  }
}

/**
 * Event type constants — used by breakout.socket.js when calling enqueue().
 */
export const AI_EVENT_TYPES = {
  STATE_SNAPSHOT:      'STATE_SNAPSHOT',
  POLICY_DENIED:       'POLICY_DENIED',
  HOST_DISCONNECTED:   'HOST_DISCONNECTED',
  BREAKOUT_CLOSED:     'BREAKOUT_CLOSED',
  PAUSE_STORM:         'PAUSE_STORM',
  CHAT_MESSAGE:        'CHAT_MESSAGE',
  VOICE_TRANSCRIPT:    'VOICE_TRANSCRIPT',
  PARTICIPANT_SNAPSHOT:'PARTICIPANT_SNAPSHOT',
};

export default new BreakoutAIIngest();
