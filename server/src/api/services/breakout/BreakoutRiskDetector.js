/**
 * BreakoutRiskDetector.js — Risk & Anomaly Detection
 * ─────────────────────────────────────────────────────
 * Capability 5: Detects structural anomalies in the audit stream.
 * Reads patterns — never takes action.
 *
 * Detects:
 *   • Repeated policy:denied by same user (>5 in 2min → RISK_ALERT)
 *   • Unstable pause/resume cycles (>3 in 10min → RISK_ALERT)
 *   • Mass disconnect patterns
 *
 * ULTRA: risk alerts always written to ai_audit_events.
 */

import logger from '../../../shared/logger.js';
import { AI_INSIGHT_TYPES } from './BreakoutAIPolicy.js';
// NOTE: ingest is passed as a parameter — NOT imported statically — to break circular deps
// BreakoutAIIngest lazy-imports this file; a static import back would cause a circular graph.

// In-memory sliding windows (resets on server restart — fine for anomaly detection)
const denialWindows = new Map(); // `${orgId}:${userId}` → [timestamps]
const pauseWindows = new Map();  // breakoutId → [timestamps]

const DENIAL_THRESHOLD = 5;      // denials per user per 2 minutes
const DENIAL_WINDOW_MS = 2 * 60_000;
const PAUSE_THRESHOLD = 3;       // pause/resume cycles per breakout per 10 minutes
const PAUSE_WINDOW_MS = 10 * 60_000;

class BreakoutRiskDetector {
  async process(event, policy, io, ingest) {
    const { type, orgId, breakoutId, payload } = event;

    try {
      switch (type) {
        case 'POLICY_DENIED':
          await this._checkDenialPattern(orgId, payload?.actorId, policy, ingest);
          break;

        case 'STATE_SNAPSHOT':
          if (payload?.status === 'PAUSED' || payload?.status === 'LIVE') {
            await this._checkPauseStorm(orgId, breakoutId, payload.status, policy, ingest);
          }
          break;

        case 'PAUSE_STORM':
          await this._checkPauseStorm(orgId, breakoutId, 'PAUSED', policy, ingest);
          break;

        case 'HOST_DISCONNECTED':
          await this._flagHostDisconnect(orgId, breakoutId, policy, ingest);
          break;
      }
    } catch (err) {
      logger.error('[BreakoutRiskDetector] process error:', err.message);
    }
  }

  async _checkDenialPattern(orgId, actorId, policy, ingest) {
    if (!actorId) return;

    const key = `${orgId}:${actorId}`;
    const now = Date.now();
    let timestamps = denialWindows.get(key) ?? [];

    // Slide window
    timestamps = timestamps.filter((t) => now - t < DENIAL_WINDOW_MS);
    timestamps.push(now);
    denialWindows.set(key, timestamps);

    if (timestamps.length >= DENIAL_THRESHOLD) {
      const insight = {
        severity: timestamps.length > DENIAL_THRESHOLD * 2 ? 'HIGH' : 'MEDIUM',
        explanation: `User triggered ${timestamps.length} policy denials in the last 2 minutes.`,
        suggested_actions: [
          'Review user activity in the audit log',
          'Consider removing the user from the breakout if behavior continues',
        ],
        actorId,
      };

      await ingest.writeInsight({
        orgId,
        type: AI_INSIGHT_TYPES.RISK_ALERT,
        mode: policy.requireAuditLog ? 'ULTRA_SECURE' : 'PROF',
        content: insight,
        confidence: 0.85,
      });

      if (policy.requireAuditLog) {
        await ingest.writeAIAudit({
          orgId,
          aiAction: 'RISK_DENIAL_PATTERN',
          model: 'rule-based',
          inputType: 'audit_stream',
          output: insight,
        });
      }

      // Reset to avoid spam
      denialWindows.set(key, []);

      logger.warn(`[BreakoutRiskDetector] Denial pattern for user ${actorId} in org ${orgId}`);
    }
  }

  async _checkPauseStorm(orgId, breakoutId, status, policy, ingest) {
    if (!breakoutId) return;

    const now = Date.now();
    let timestamps = pauseWindows.get(breakoutId) ?? [];
    timestamps = timestamps.filter((t) => now - t < PAUSE_WINDOW_MS);
    timestamps.push(now);
    pauseWindows.set(breakoutId, timestamps);

    if (timestamps.length >= PAUSE_THRESHOLD) {
      const insight = {
        severity: 'HIGH',
        explanation: `Breakout has been paused/resumed ${timestamps.length} times in 10 minutes — unstable session pattern.`,
        suggested_actions: [
          'Assign a more reliable host',
          'Review network conditions for the host device',
          'Consider closing and restarting the breakout',
        ],
      };

      await ingest.writeInsight({
        orgId,
        breakoutId,
        type: AI_INSIGHT_TYPES.RISK_ALERT,
        mode: policy.requireAuditLog ? 'ULTRA_SECURE' : 'PROF',
        content: insight,
        confidence: 0.9,
      });

      if (policy.requireAuditLog) {
        await ingest.writeAIAudit({
          orgId,
          aiAction: 'RISK_PAUSE_STORM',
          model: 'rule-based',
          inputType: 'state_stream',
          output: insight,
        });
      }

      pauseWindows.set(breakoutId, []);
    }
  }

  async _flagHostDisconnect(orgId, breakoutId, policy, ingest) {
    // Only surface a risk alert if ULTRA (PROF/FUN don't need noise)
    if (!policy.requireAuditLog) return;

    const insight = {
      severity: 'MEDIUM',
      explanation: 'Host disconnected — ULTRA session was automatically paused.',
      suggested_actions: [
        'Assign a new host before resuming',
        'Review the audit log for session timeline',
      ],
    };

    await ingest.writeInsight({
      orgId,
      breakoutId,
      type: AI_INSIGHT_TYPES.RISK_ALERT,
      mode: 'ULTRA_SECURE',
      content: insight,
      confidence: 1.0, // deterministic
    });
  }
}

export default new BreakoutRiskDetector();
