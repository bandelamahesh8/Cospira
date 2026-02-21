import { supabase } from '@/integrations/supabase/client';

export interface Season {
    id: string;
    name: string;
    description: string;
    theme_color: string;
    end_at: string;
    levels: BattlePassLevel[];
}

export interface BattlePassLevel {
    level: number;
    reward_type: 'coins' | 'asset' | 'xp';
    reward_value: string;
    is_premium: boolean;
    status?: 'locked' | 'available' | 'claimed'; // UI computed
}

export interface PlayerProgress {
    current_xp: number;
    claimed_levels: number[];
    is_premium: boolean;
    level: number; // Computed: floor(xp / 1000) + 1
}

const XP_PER_LEVEL = 1000;

export class SeasonService {

    static async getActiveSeason() {
        // Get active season
        const { data: season } = await supabase
            .from('seasons')
            .select('*')
            .eq('is_active', true)
            .single();

        if (!season) return null;

        // Get levels
        const { data: levels } = await supabase
            .from('battle_pass_levels')
            .select('*')
            .eq('season_id', season.id)
            .order('level', { ascending: true });

        return { ...season, levels } as Season;
    }

    static async getPlayerProgress(userId: string, seasonId: string) {
        let { data, error } = await supabase
            .from('player_season_progress')
            .select('*')
            .eq('user_id', userId)
            .eq('season_id', seasonId)
            .single();

        if (error && error.code === 'PGRST116') {
            // Not started yet, create init
            const { data: newData, error: createError } = await supabase
                .from('player_season_progress')
                .insert({ user_id: userId, season_id: seasonId })
                .select()
                .single();
            
            if (createError) throw createError;
            data = newData;
        }

        const xp = data.current_xp || 0;
        return {
            ...data,
            level: Math.floor(xp / XP_PER_LEVEL) + 1
        } as PlayerProgress;
    }

    static async claimReward(userId: string, seasonId: string, level: number, rewardType: string, rewardValue: string) {
        // 1. Fetch current progress to verify eligibility
        const { data: progress } = await supabase
            .from('player_season_progress')
            .select('claimed_levels, current_xp')
            .eq('user_id', userId)
            .eq('season_id', seasonId)
            .single();

        if (!progress) throw new Error('No progress found');
        
        const currentLevel = Math.floor(progress.current_xp / XP_PER_LEVEL) + 1;
        if (currentLevel < level) throw new Error('Level not reached');
        if (progress.claimed_levels?.includes(level)) throw new Error('Already claimed');

        // 2. Grant Reward (Naive client-side logic for MVP, ideal is RPC)
        if (rewardType === 'coins') {
            // Update profile coins
            // Fetch current first
             const { data: profile } = await supabase.from('player_profiles').select('coins').eq('id', userId).single();
             if (profile) {
                 await supabase.from('player_profiles').update({ coins: profile.coins + parseInt(rewardValue) }).eq('id', userId);
             }
        }
        // Handle assets later

        // 3. Mark Claimed
        const newClaimed = [...(progress.claimed_levels || []), level];
        const { error } = await supabase
            .from('player_season_progress')
            .update({ claimed_levels: newClaimed })
            .eq('user_id', userId)
            .eq('season_id', seasonId);

        if (error) throw error;
    }
}
