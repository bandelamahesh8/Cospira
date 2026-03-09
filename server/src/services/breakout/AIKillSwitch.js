/**
 * AIKillSwitch.js — Global + Per-Org AI Disable
 * ─────────────────────────────────────────────
 * Non-negotiable Phase 0 requirement:
 *   AI can be killed instantly without redeploy.
 *
 * Hierarchy (first false wins):
 *   1. Global env flag: AI_ENABLED=true/false
 *   2. Per-org DB flag: organizations.ai_enabled
 *
 * Usage:
 *   import AIKillSwitch from './AIKillSwitch.js';
 *   if (!await AIKillSwitch.isEnabled(orgId)) return;
 */

import { supabase } from '../../supabase.js';
import logger from '../../logger.js';

class AIKillSwitch {
  constructor() {
    // In-memory cache — refreshed every 30s to avoid N+1 DB queries per event
    this._cache = new Map();
    this._cacheRefreshMs = 30_000;
    this._lastGlobalCheck = 0;
    this._globalEnabled = null;

    // Emergency in-process kill (no DB/env round-trip)
    this._emergencyKill = false;
  }

  /**
   * Emergency hard-kill — overrides everything including DB flag.
   * Called from kill-switch socket event handler.
   */
  kill(orgId = null) {
    if (orgId) {
      this._cache.set(orgId, { enabled: false, ts: Date.now() });
      logger.warn(`[AIKillSwitch] AI killed for org ${orgId}`);
    } else {
      this._emergencyKill = true;
      this._globalEnabled = false;
      logger.warn('[AIKillSwitch] ⚠️  GLOBAL AI KILL ACTIVATED');
    }
  }

  /**
   * Re-enable AI (per-org or global).
   */
  enable(orgId = null) {
    if (orgId) {
      this._cache.delete(orgId); // Force DB re-check
      logger.info(`[AIKillSwitch] AI re-enabled for org ${orgId}`);
    } else {
      this._emergencyKill = false;
      this._globalEnabled = null; // Force env re-check
      logger.info('[AIKillSwitch] Global AI re-enabled');
    }
  }

  /**
   * Primary check — call before every AI processing step.
   * Returns false = drop event, do nothing.
   */
  async isEnabled(orgId) {
    // Emergency kill always wins
    if (this._emergencyKill) return false;

    // Global env check (cached 30s)
    const now = Date.now();
    if (this._globalEnabled === null || now - this._lastGlobalCheck > this._cacheRefreshMs) {
      this._globalEnabled = process.env.AI_ENABLED === 'true';
      this._lastGlobalCheck = now;
    }
    if (!this._globalEnabled) return false;

    // Per-org DB check (cached 30s)
    if (orgId) {
      const cached = this._cache.get(orgId);
      if (cached && now - cached.ts < this._cacheRefreshMs) {
        return cached.enabled;
      }

      try {
        if (!supabase) return false; // Supabase unavailable → fail safe: disabled
        const { data } = await supabase
          .from('organizations')
          .select('ai_enabled')
          .eq('id', orgId)
          .single();

        const enabled = data?.ai_enabled === true;
        this._cache.set(orgId, { enabled, ts: now });
        return enabled;
      } catch (err) {
        // Fail safe: if we can't check, default to OFF
        logger.error('[AIKillSwitch] DB check failed — defaulting to disabled:', err.message);
        return false;
      }
    }

    return this._globalEnabled;
  }

  /**
   * Synchronous check for hot path (uses cached value only).
   * Use isEnabled() for accurate check. Use this only where async is not possible.
   */
  isEnabledSync(orgId) {
    if (this._emergencyKill) return false;
    if (!this._globalEnabled) return false;
    if (!orgId) return this._globalEnabled;
    return this._cache.get(orgId)?.enabled ?? false;
  }
}

export default new AIKillSwitch();
