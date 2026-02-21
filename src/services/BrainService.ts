import { supabase } from '@/integrations/supabase/client';

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

interface MatchHistory {
    player1_id: string;
    player2_id: string;
    winner_id: string;
    ended_at: string;
    game_state?: unknown;
}

export class BrainService {

    // 1. Player Intelligence Engine
    static async analyzePlayer(userId: string) {
        // Fetch recent matches
        const { data: matches } = await supabase
            .from('match_history')
            .select('*')
            .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
            .order('ended_at', { ascending: false })
            .limit(20);

        if (!matches || matches.length === 0) return;

        // Calculate Metrics (Mock Heuristics)
        let totalMoves = 0;
        let _totalDuration = 0;
        let wins = 0;

        matches.forEach((m: MatchHistory) => {
            const isWinner = m.winner_id === userId;
            if (isWinner) wins++;
            
            // Assume we had move count/duration stored in game_state JSON or similar
            // For now, randomizing/approximating for the MVP simulation
            totalMoves += Math.floor(Math.random() * 40) + 10;
            _totalDuration += Math.floor(Math.random() * 600) + 60;
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
        const { error } = await supabase.from('player_intelligence').upsert({
            user_id: userId,
            play_style: playStyle,
            aggression_index: aggression,
            consistency_score: consistency,
            last_updated: new Date().toISOString()
        });

        // eslint-disable-next-line no-console
        if (error) console.error('Brain Update Failed:', error);
        
        // For simulation, we run prediction immediately after analysis
        await this.predictPlayer(userId);
    }
    
    // 2. Predictive Engine (Phase 20)
    static async predictPlayer(userId: string) {
        // Get DNA
        const { data: dna } = await supabase.from('player_intelligence').select('*').eq('user_id', userId).single();
        if (!dna) return; // Need DNA to predict

        // Heuristic Models
        // Model A: Churn Risk (Inconsistent players churn more)
        const churnProb = dna.consistency_score < 0.3 ? 0.75 : 
                          dna.consistency_score < 0.6 ? 0.3 : 0.05;

        // Model B: Tilt Risk (Toxic players tilt easy)
        const tiltProb = dna.toxicity_score > 0.6 ? 0.85 :
                         dna.toxicity_score > 0.3 ? 0.4 : 0.02;

        // Model C: Win Prob (Based on Skill)
        const winProb = Math.min(0.9, Math.max(0.1, (dna.skill_level || 1000) / 2000));

        // Model D: Improvement (Learning Rate proxy)
        const improvement = (dna.learning_rate || 0) * 100 + (Math.random() * 10 - 5);

        // Update DB
        const { error } = await supabase.from('player_predictions').upsert({
            user_id: userId,
            churn_probability: churnProb,
            tilt_probability: tiltProb,
            win_probability: winProb,
            improvement_rate: improvement,
            updated_at: new Date().toISOString()
        });
        
        // eslint-disable-next-line no-console
        if (error) console.error('Prediction Failed:', error);
    }

    static async getPredictions(userId: string) {
        const { data } = await supabase.from('player_predictions').select('*').eq('user_id', userId).single();
        return data as PlayerPrediction;
    }

    // Phase 25: Probabilistic Models
    static async updateDistributions(userId: string) {
        // 1. Fetch recent performance to calculate Variance
        // For simulation, we'll randomize Sigma to show "Uncertainty"
        const skillSigma = 30 + Math.random() * 50; // Between 30 and 80 uncertainty
        const tiltSigma = 0.05 + Math.random() * 0.1;

        await supabase.from('player_distributions').upsert({
            user_id: userId,
            skill_mu: 1200 + Math.random() * 400, // Sync with actual Elo in real app
            skill_sigma: skillSigma,
            tilt_mu: Math.random(),
            tilt_sigma: tiltSigma,
            updated_at: new Date().toISOString()
        });
    }

    static async getProbabilisticState(userId: string) {
        const { data } = await supabase.from('player_distributions').select('*').eq('user_id', userId).single();
        return data;
    }

    // 2. Meta Engine
    static async getGlobalIntel() {
        const { data } = await supabase.from('game_meta').select('*').order('win_rate', { ascending: false });
        return data as GameMeta[];
    }
    
    static async getPlayerDNA(userId: string) {
        const { data } = await supabase.from('player_intelligence').select('*').eq('user_id', userId).single();
        return data as PlayerDNA;
    }
}
