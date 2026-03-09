/**
 * breakout-ai.socket.js — AI Socket Bridge
 * ─────────────────────────────────────────
 * Read-only AI event bridge:
 *   • Emits 'ai:insight:new' to org owner room (done via BreakoutAIIngest)
 *   • Handles 'ai:kill' and 'ai:enable' from owner (kill switch)
 *   • Handles 'ai:insights:request' for initial panel load
 *
 * AI NEVER emits socket commands that mutate state.
 */

import logger from '../logger.js';
import AIKillSwitch from '../services/breakout/AIKillSwitch.js';
import BreakoutAIIngest, { AI_EVENT_TYPES } from '../services/breakout/BreakoutAIIngest.js';
import { supabase } from '../supabase.js';

export default function registerBreakoutAIHandlers(io, socket) {
  const userId = socket.user?.id || socket.user?.sub;

  // Guard: if supabase is not configured no AI features can run
  if (!supabase) {
    logger.warn('[BreakoutAI] Supabase not configured — AI socket handlers disabled');
    return;
  }

  // ── ai:kill — Emergency kill switch (owner only) ──────────
  socket.on('ai:kill', async ({ orgId, global: globalKill = false }, callback) => {
    try {
      if (!userId || !orgId) return callback?.({ success: false, error: 'Unauthorized' });

      // Verify caller is org owner
      const { data: org } = await supabase
        .from('organizations')
        .select('owner_id')
        .eq('id', orgId)
        .single();

      if (org?.owner_id !== userId) {
        return callback?.({ success: false, error: 'Only org owner can control AI' });
      }

      if (globalKill) {
        AIKillSwitch.kill(); // Global kill
        logger.warn(`[BreakoutAI] GLOBAL AI KILL by owner ${userId}`);
      } else {
        AIKillSwitch.kill(orgId);
        // Also update DB flag for persistence across restarts
        await supabase
          .from('organizations')
          .update({ ai_enabled: false })
          .eq('id', orgId);
      }

      io.to(`org:${orgId}:owner`).emit('ai:status', { enabled: false, orgId });
      callback?.({ success: true });
    } catch (err) {
      logger.error('[BreakoutAI] ai:kill error:', err.message);
      callback?.({ success: false, error: err.message });
    }
  });

  // ── ai:enable — Re-enable AI (owner only) ─────────────────
  socket.on('ai:enable', async ({ orgId }, callback) => {
    try {
      const { data: org } = await supabase
        .from('organizations')
        .select('owner_id')
        .eq('id', orgId)
        .single();

      if (org?.owner_id !== userId) {
        return callback?.({ success: false, error: 'Only org owner can control AI' });
      }

      AIKillSwitch.enable(orgId);
      await supabase
        .from('organizations')
        .update({ ai_enabled: true })
        .eq('id', orgId);

      io.to(`org:${orgId}:owner`).emit('ai:status', { enabled: true, orgId });
      callback?.({ success: true });
    } catch (err) {
      logger.error('[BreakoutAI] ai:enable error:', err.message);
      callback?.({ success: false, error: err.message });
    }
  });

  // ── ai:insights:request — Load existing insights for panel ─
  socket.on('ai:insights:request', async ({ orgId, breakoutId, limit = 50 }, callback) => {
    try {
      // Verify owner
      const { data: org } = await supabase
        .from('organizations')
        .select('owner_id')
        .eq('id', orgId)
        .single();

      if (org?.owner_id !== userId) {
        return callback?.({ success: false, error: 'Only org owner can view AI insights' });
      }

      let query = supabase
        .from('ai_insights')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (breakoutId) query = query.eq('breakout_id', breakoutId);

      const { data, error } = await query;
      if (error) throw error;

      callback?.({ success: true, insights: data ?? [] });
    } catch (err) {
      logger.error('[BreakoutAI] ai:insights:request error:', err.message);
      callback?.({ success: false, error: err.message });
    }
  });
}

/**
 * Hook called from breakout.socket.js after every committed action.
 * Enqueues the event for AI processing.
 *
 * @param {Object} params
 * @param {string} params.type - AI_EVENT_TYPES constant
 * @param {string} params.orgId
 * @param {string} [params.breakoutId]
 * @param {string} params.mode - effectiveMode
 * @param {Object} params.payload - Immutable snapshot (no raw content)
 */
export function enqueueForAI({ type, orgId, breakoutId, mode, payload }) {
  BreakoutAIIngest.enqueue({ type, orgId, breakoutId, mode, payload });
}

export { AI_EVENT_TYPES };
