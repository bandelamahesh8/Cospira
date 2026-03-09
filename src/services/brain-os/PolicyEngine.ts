import { supabase } from '@/integrations/supabase/client';
import { BrainService } from '../BrainService';
import { logger } from '@/utils/logger';

export interface BrainPolicy {
  id: string;
  domain: string;
  title: string;
  condition: unknown;
  action: unknown;
  weight: number;
}

export class PolicyEngine {
  private static cache: BrainPolicy[] = [];

  /**
   * Loads policies into memory.
   */
  static async loadPolicies() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('brain_policies')
      .select('*')
      .eq('is_active', true)
      .order('weight', { ascending: false });

    if (data) {
      this.cache = (data as unknown[]).map((p) => p as unknown as BrainPolicy);
      logger.info(`[POLICY_ENGINE] Loaded ${this.cache.length} policies.`);
    }
  }

  /**
   * Evaluates all policies against a player's current state.
   */
  static async evaluatePoliciesForPlayer(userId: string, context: string, payload: unknown) {
    // 1. Get Player Context (DNA + Predictions)
    const predictions = await BrainService.getPredictions(userId);
    if (!predictions) return [];

    const matchingDecisions: unknown[] = [];

    // 2. Iterate Policies
    for (const policy of this.cache) {
      if (policy.domain !== 'ALL' && policy.domain !== context) continue;

      const isMatch = this.checkCondition(policy.condition, predictions, payload);

      if (isMatch) {
        logger.info(`[POLICY_MATCH] Policy "${policy.title}" matched for user ${userId}`);
        matchingDecisions.push({
          policy_id: policy.id,
          action: policy.action,
          weight: policy.weight,
        });
      }
    }

    return matchingDecisions;
  }

  /**
   * Simple Condition Evaluator
   * condition: { metric: 'churn_probability', operator: '>', value: 0.5 }
   */
  private static checkCondition(
    condition: unknown,
    playerState: unknown,
    eventPayload: unknown
  ): boolean {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cond = condition as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pState = playerState as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ePayload = eventPayload as any;

    if (!cond || !cond.metric) return false;

    // Resolve metric from player state (e.g. predictions.churn_probability)
    let actualValue = pState ? pState[cond.metric] : undefined;

    // Or from event payload
    if (actualValue === undefined && ePayload) {
      actualValue = ePayload[cond.metric];
    }

    if (actualValue === undefined) return false;

    switch (cond.operator) {
      case '>':
        return actualValue > cond.value;
      case '<':
        return actualValue < cond.value;
      case '>=':
        return actualValue >= cond.value;
      case '<=':
        return actualValue <= cond.value;
      case '==':
        return actualValue == cond.value;
      default:
        return false;
    }
  }
}
