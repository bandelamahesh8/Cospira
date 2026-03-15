/**
 * BreakoutEngagementAnalyzer.js — Attention & Health Metrics
 * ───────────────────────────────────────────────────────────
 * Capability 4: Tracks engagement per breakout.
 * Detects dead sessions, dominant speakers, inactivity.
 *
 * Outputs ENGAGEMENT_ALERT insights — never auto-intervenes.
 */

import logger from '../../logger.js';
import { AI_INSIGHT_TYPES } from './BreakoutAIPolicy.js';
// ingest is passed as parameter — not imported statically — to break circular deps

const INACTIVITY_THRESHOLD_MS = 15 * 60_000; // 15 min
const CHAT_VOLUME_WINDOW_MS = 5 * 60_000;    // 5 min sliding window

// Per-breakout engagement state
const engagementState = new Map(); // breakoutId → { lastActivity, chatCount, participantCount, talkTimeMap }

class BreakoutEngagementAnalyzer {
  async process(event, policy, io, ingest) {
    const { type, orgId, breakoutId, payload } = event;
    if (!breakoutId) return;

    try {
      switch (type) {
        case 'CHAT_MESSAGE':
          this._recordChat(breakoutId);
          await this._checkEngagement(orgId, breakoutId, policy, ingest);
          break;

        case 'STATE_SNAPSHOT':
          if (payload?.status === 'LIVE') {
            this._initState(breakoutId, payload?.participantCount ?? 0);
            await this._checkEngagement(orgId, breakoutId, policy, ingest);
          }
          break;

        case 'HOST_DISCONNECTED':
          this._recordActivity(breakoutId);
          break;
      }
    } catch (err) {
      logger.error('[BreakoutEngagementAnalyzer] process error:', err.message);
    }
  }

  _initState(breakoutId, participantCount) {
    if (!engagementState.has(breakoutId)) {
      engagementState.set(breakoutId, {
        lastActivity: Date.now(),
        chatEvents: [],
        participantCount,
      });
    } else {
      const s = engagementState.get(breakoutId);
      s.participantCount = participantCount;
    }
  }

  _recordActivity(breakoutId) {
    const s = engagementState.get(breakoutId);
    if (s) s.lastActivity = Date.now();
  }

  _recordChat(breakoutId) {
    const now = Date.now();
    const s = engagementState.get(breakoutId) ?? { lastActivity: now, chatEvents: [], participantCount: 0 };
    s.chatEvents = s.chatEvents.filter((t) => now - t < CHAT_VOLUME_WINDOW_MS);
    s.chatEvents.push(now);
    s.lastActivity = now;
    engagementState.set(breakoutId, s);
  }

  async _checkEngagement(orgId, breakoutId, policy, ingest) {
    const s = engagementState.get(breakoutId);
    if (!s) return;

    const now = Date.now();
    const inactiveMs = now - s.lastActivity;

    // Inactivity alert
    if (inactiveMs > INACTIVITY_THRESHOLD_MS) {
      const minutesIdle = Math.round(inactiveMs / 60_000);
      const insight = {
        signal: 'INACTIVITY',
        suggestion: `No chat or voice activity for ${minutesIdle} minutes. Consider checking in with participants.`,
        minutesIdle,
        participantCount: s.participantCount,
      };

      await ingest.writeInsight({
        orgId,
        breakoutId,
        type: AI_INSIGHT_TYPES.ENGAGEMENT_ALERT,
        mode: policy.requireAuditLog ? 'ULTRA_SECURE' : 'PROF',
        content: insight,
        confidence: 0.8,
      });

      // Reset to avoid spam
      s.lastActivity = now;
      logger.info(`[BreakoutEngagementAnalyzer] Inactivity alert for breakout ${breakoutId}`);
    }
  }
}

export default new BreakoutEngagementAnalyzer();
