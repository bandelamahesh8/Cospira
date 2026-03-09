import { supabase } from '@/integrations/supabase/client';
import { BrainService } from './BrainService';

export interface MutationSuggestion {
  action: 'nerf' | 'buff';
  parameter: string;
  change: number;
  reason: string;
}

export interface MetaEvolution {
  id: string;
  game_id: string;
  strategy_key: string;
  trend_score: number;
  mutation_suggestion: MutationSuggestion;
  status: 'PENDING' | 'APPLIED' | 'REJECTED';
}

export class MetaEvolutionService {
  static async evolveMeta(gameId: string) {
    // 1. Get Current Meta State
    const intel = await BrainService.getGlobalIntel();
    if (!intel) return;

    const gameStrategies = intel.filter((m) => m.game_id === gameId);

    for (const strat of gameStrategies) {
      let mutation: MutationSuggestion | null = null;

      // Rule 1: Dominant Strategy (Nerf)
      if (strat.win_rate > 0.6 && strat.usage_rate > 0.3) {
        mutation = {
          action: 'nerf',
          parameter: 'power_level', // abstract param
          change: -10,
          reason: `Win Rate ${(strat.win_rate * 100).toFixed(1)}% exceeds balance threshold`,
        };
      }
      // Rule 2: Weak Strategy (Buff)
      else if (strat.win_rate < 0.4) {
        mutation = {
          action: 'buff',
          parameter: 'power_level',
          change: +10,
          reason: `Underperforming strategy (WR: ${(strat.win_rate * 100).toFixed(1)}%)`,
        };
      }

      if (mutation) {
        // Upsert Mutation
        await supabase.from('meta_evolution').upsert(
          {
            game_id: gameId,
            strategy_key: strat.strategy_key,
            trend_score: strat.trend_score,
            mutation_suggestion: mutation,
            status: 'PENDING',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'game_id, strategy_key' }
        );
      }
    }
  }

  static async getPendingMutations() {
    const { data } = await supabase.from('meta_evolution').select('*').eq('status', 'PENDING');
    return data as MetaEvolution[];
  }

  /**
   * Phase 27: Meta Learning Engine
   * Predictive Trend Analysis
   */
  static async getMetaForecast() {
    // In a real app, calculate slope of win_rate over last 14 days.
    // For simulation: Randomized Forecasting.
    const strategies = ['sicilian_defense', 'queens_gambit', 'scholars_mate', 'berlin_defense'];

    return strategies.map((key) => {
      const currentWinRate = 0.5 + (Math.random() * 0.2 - 0.1); // 40-60%
      const growthRate = Math.random() * 0.1 - 0.05; // -5% to +5% per week

      return {
        strategy_key: key,
        current_win_rate: currentWinRate,
        growth_rate: growthRate,
        prediction:
          currentWinRate + growthRate > 0.6
            ? 'DOMINANT'
            : currentWinRate + growthRate < 0.4
              ? 'OBSOLETE'
              : 'STABLE',
        projected_win_rate: currentWinRate + growthRate,
      };
    });
  }
}
