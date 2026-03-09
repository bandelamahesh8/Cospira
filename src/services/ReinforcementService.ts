import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface DecisionOutcome {
  id: string;
  decision_type: string;
  outcome: 'IMPROVED' | 'WORSENED' | 'NEUTRAL';
  reward_score: number;
  created_at: string;
}

export class ReinforcementService {
  /**
   * Simulates the feedback loop.
   * In a real system, this runs via a cron job 24h after an intervention.
   */
  static async simulateFeedbackLoop(userId: string, decisionType: string) {
    if (decisionType === 'NONE') return null;

    // 1. Snapshot Before (Mocked)
    const engagementBefore = Math.random(); // 0-1 score

    // 2. Simulate User Reaction
    // 70% chance the intervention worked (Reward), 30% it failed
    const worked = Math.random() > 0.3;
    const engagementAfter = worked ? engagementBefore + 0.2 : engagementBefore - 0.1;

    // 3. Calculate Reward
    let outcome: 'IMPROVED' | 'WORSENED' | 'NEUTRAL' = 'NEUTRAL';
    let reward = 0;

    if (engagementAfter > engagementBefore + 0.05) {
      outcome = 'IMPROVED';
      reward = 1.0;
    } else if (engagementAfter < engagementBefore - 0.05) {
      outcome = 'WORSENED';
      reward = -1.0;
    }

    logger.info(`[RL] Feedback for ${decisionType}: ${outcome} (Reward: ${reward})`);

    // 4. Store Experience
    const { data } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('brain_decision_outcomes' as any)
      .insert({
        user_id: userId,
        decision_type: decisionType,
        outcome: outcome,
        reward_score: reward,
        metrics_before: { engagement: engagementBefore },
        metrics_after: { engagement: engagementAfter },
      })
      .select()
      .single();

    return data as unknown as DecisionOutcome;
  }

  static async getLearningStats() {
    const { data } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('brain_decision_outcomes' as any)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    return (data || []) as unknown as DecisionOutcome[];
  }
}
