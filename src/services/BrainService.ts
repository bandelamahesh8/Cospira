import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface PlayerDNA {
  user_id: string;
  aggression_index: number;
  consistency_score: number;
  play_style: 'aggressive' | 'defensive' | 'balanced' | 'chaotic';
  toxicity_score: number;
}

export interface PlayerPrediction {
  user_id: string;
  churn_probability: number;
  win_probability: number;
  tilt_probability: number;
  improvement_rate: number;
  updated_at: string;
}

export interface GameMeta {
  game_id: string;
  strategy_key: string;
  win_rate: number;
  usage_rate: number;
  trend_score: number;
}

export class BrainService {
  // 1. Player Intelligence Engine
  static async analyzePlayer(userId: string) {
    // Fetch recent matches
    const { data: matches, error: fetchError } = await supabase
      .from('match_history')
      .select('*')
      .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
      .order('ended_at', { ascending: false })
      .limit(20);

    if (fetchError) {
      logger.error('Error fetching matches for analysis:', fetchError);
      return;
    }

    if (!matches || matches.length === 0) return;

    // Calculate Metrics (Mock Heuristics)
    let totalMoves = 0;
    let wins = 0;

    (matches as unknown[]).forEach((row: unknown) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const m = row as any;
      const isWinner = m.winner_id === userId;
      if (isWinner) wins++;

      // Assume we had move count/duration stored in game_state JSON or similar
      // For now, randomizing/approximating for the MVP simulation
      totalMoves += Math.floor(Math.random() * 40) + 10;
    });

    const avgMoves = totalMoves / matches.length;
    const winRate = wins / matches.length;

    // DNA Determination
    let playStyle: PlayerDNA['play_style'] = 'balanced';
    let aggression = 0.5;

    if (avgMoves < 20) {
      playStyle = 'aggressive';
      aggression = 0.8;
    } else if (avgMoves > 40) {
      playStyle = 'defensive';
      aggression = 0.2;
    }

    const consistency = winRate > 0.4 && winRate < 0.6 ? 0.9 : 0.5; // Stub logic

    // Update DB
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('player_intelligence').upsert({
      user_id: userId,
      play_style: playStyle,
      aggression_index: aggression,
      consistency_score: consistency,
      last_updated: new Date().toISOString(),
    });

    if (error) logger.error('Brain Update Failed:', error);

    // For simulation, we run prediction immediately after analysis
    await this.predictPlayer(userId);
  }

  // 2. Predictive Engine (Phase 20)
  static async predictPlayer(userId: string) {
    // Get DNA
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: dna, error: dnaError } = await (supabase as any)
      .from('player_intelligence')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (dnaError || !dna) return; // Need DNA to predict

    // Heuristic Models
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d = dna as any;
    const churnProb = d.consistency_score < 0.3 ? 0.75 : d.consistency_score < 0.6 ? 0.3 : 0.05;

    const tiltProb = d.toxicity_score > 0.6 ? 0.85 : d.toxicity_score > 0.3 ? 0.4 : 0.02;

    const winProb = Math.min(0.9, Math.max(0.1, (d.skill_level || 1000) / 2000));

    const improvement = (d.learning_rate || 0) * 100 + (Math.random() * 10 - 5);

    // Update DB
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('player_predictions').upsert({
      user_id: userId,
      churn_probability: churnProb,
      tilt_probability: tiltProb,
      win_probability: winProb,
      improvement_rate: improvement,
      updated_at: new Date().toISOString(),
    });

    if (error) logger.error('Prediction Failed:', error);
  }

  static async getPredictions(userId: string): Promise<PlayerPrediction | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('player_predictions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      logger.error('Error fetching predictions:', error);
      return null;
    }
    return data as unknown as PlayerPrediction;
  }

  // Phase 25: Probabilistic Models
  static async updateDistributions(userId: string) {
    // 1. Fetch recent performance to calculate Variance
    // For simulation, we'll randomize Sigma to show "Uncertainty"
    const skillSigma = 30 + Math.random() * 50; // Between 30 and 80 uncertainty
    const tiltSigma = 0.05 + Math.random() * 0.1;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('player_distributions').upsert({
      user_id: userId,
      skill_mu: 1200 + Math.random() * 400, // Sync with actual Elo in real app
      skill_sigma: skillSigma,
      tilt_mu: Math.random(),
      tilt_sigma: tiltSigma,
      updated_at: new Date().toISOString(),
    });
  }

  static async getProbabilisticState(userId: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('player_distributions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    return data;
  }

  // 2. Meta Engine
  static async getGlobalIntel(): Promise<GameMeta[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('game_meta')
      .select('*')
      .order('win_rate', { ascending: false });
    return (data || []) as unknown as GameMeta[];
  }

  static async getPlayerDNA(userId: string): Promise<PlayerDNA | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('player_intelligence')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    return data as unknown as PlayerDNA;
  }
}
