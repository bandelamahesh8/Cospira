import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

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
  static async getActiveSeason(): Promise<Season | null> {
    // Get active season
    const { data: season, error: seasonError } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('seasons' as any)
      .select('*')
      .eq('is_active', true)
      .maybeSingle();

    if (seasonError || !season) return null;

    // Get levels
    const { data: levels, error: levelsError } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('battle_pass_levels' as any)
      .select('*')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .eq('season_id', (season as any).id)
      .order('level', { ascending: true });

    if (levelsError) {
      logger.error('Error fetching battle pass levels:', levelsError);
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { ...(season as any), levels } as unknown as Season;
  }

  static async getPlayerProgress(userId: string, seasonId: string): Promise<PlayerProgress | null> {
    const { data: existingData, error: fetchError } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('player_season_progress' as any)
      .select('*')
      .eq('user_id', userId)
      .eq('season_id', seasonId)
      .maybeSingle();

    let progress = existingData;

    if (fetchError && fetchError.code !== 'PGRST116') {
      logger.error('Error fetching player season progress:', fetchError);
      throw fetchError;
    }

    if (!existingData) {
      // Not started yet, create init
      const { data: newData, error: createError } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from('player_season_progress' as any)
        .insert({ user_id: userId, season_id: seasonId })
        .select()
        .single();

      if (createError) {
        logger.error('Error creating player season progress:', createError);
        throw createError;
      }
      progress = newData;
    }

    if (!progress) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const xp = (progress as any).current_xp || 0;
    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(progress as any),
      level: Math.floor(xp / XP_PER_LEVEL) + 1,
    } as unknown as PlayerProgress;
  }

  static async claimReward(
    userId: string,
    seasonId: string,
    level: number,
    rewardType: string,
    rewardValue: string
  ): Promise<void> {
    // 1. Fetch current progress to verify eligibility
    const { data: progressData, error: fetchError } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('player_season_progress' as any)
      .select('claimed_levels, current_xp')
      .eq('user_id', userId)
      .eq('season_id', seasonId)
      .maybeSingle();

    if (fetchError || !progressData) {
      logger.error('Error fetching progress for claim:', fetchError);
      throw new Error('No progress found');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const progress = progressData as any;
    const currentLevel = Math.floor(progress.current_xp / XP_PER_LEVEL) + 1;
    if (currentLevel < level) throw new Error('Level not reached');
    if (progress.claimed_levels?.includes(level)) throw new Error('Already claimed');

    // 2. Grant Reward (Naive client-side logic for MVP, ideal is RPC)
    if (rewardType === 'coins') {
      // Update profile coins
      // Fetch current first
      const { data: profile, error: profileError } = await supabase
        .from('player_profiles')
        .select('coins')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        logger.error('Error fetching profile for reward:', profileError);
      } else if (profile) {
        await supabase
          .from('player_profiles')
          .update({ coins: profile.coins + parseInt(rewardValue, 10) })
          .eq('id', userId);
      }
    }
    // Handle assets later

    // 3. Mark Claimed
    const newClaimed = [...(progress.claimed_levels || []), level];
    const { error: updateError } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('player_season_progress' as any)
      .update({ claimed_levels: newClaimed })
      .eq('user_id', userId)
      .eq('season_id', seasonId);

    if (updateError) {
      logger.error('Error updating claimed levels:', updateError);
      throw updateError;
    }
  }
}
