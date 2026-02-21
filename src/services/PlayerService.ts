import { supabase } from '@/integrations/supabase/client';
import {
  PlayerProfile,
  GameStats,
  GameType,
  MatchHistory,
  PlayerAchievement,
  XP_REWARDS,
  calculateLevel,
} from '@/types/player';
import { eloService } from './ELOService';

/**
 * Player Service
 * 
 * Handles all player profile operations, game statistics,
 * match history, and achievements.
 */
export class PlayerService {
  /**
   * Get player profile by ID
   */
  async getPlayerProfile(playerId: string): Promise<PlayerProfile | null> {
    const { data, error } = await supabase
      .from('player_profiles')
      .select('*')
      .eq('id', playerId)
      .single();

    if (error) {
      console.error('Error fetching player profile:', error);
      return null;
    }

    return data;
  }

  /**
   * Create or update player profile
   */
  async upsertPlayerProfile(profile: Partial<PlayerProfile>): Promise<PlayerProfile | null> {
    const { data, error } = await supabase
      .from('player_profiles')
      .upsert(profile)
      .select()
      .single();

    if (error) {
      console.error('Error upserting player profile:', error);
      return null;
    }

    return data;
  }

  /**
   * Get game statistics for a player
   */
  async getGameStats(playerId: string, gameType: GameType): Promise<GameStats | null> {
    const { data, error } = await supabase
      .from('game_stats')
      .select('*')
      .eq('player_id', playerId)
      .eq('game_type', gameType)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching game stats:', error);
      return null;
    }

    return data;
  }

  /**
   * Initialize game stats for a player (first time playing a game)
   */
  async initializeGameStats(playerId: string, gameType: GameType): Promise<GameStats | null> {
    const { data, error } = await supabase
      .from('game_stats')
      .insert({
        player_id: playerId,
        game_type: gameType,
      })
      .select()
      .single();

    if (error) {
      console.error('Error initializing game stats:', error);
      return null;
    }

    return data;
  }

  /**
   * Update game statistics after a match
   */
  async updateGameStats(
    playerId: string,
    gameType: GameType,
    result: 'win' | 'loss' | 'draw',
    opponentElo: number,
    duration: number
  ): Promise<GameStats | null> {
    // Get current stats
    let stats = await this.getGameStats(playerId, gameType);
    
    // Initialize if doesn't exist
    if (!stats) {
      stats = await this.initializeGameStats(playerId, gameType);
      if (!stats) return null;
    }

    // Calculate new ELO
    const eloResult = eloService.calculateNewELO(stats.elo, opponentElo, result);

    // Update win streak
    const currentWinStreak = result === 'win' ? stats.current_win_streak + 1 : 0;
    const longestWinStreak = Math.max(stats.longest_win_streak, currentWinStreak);

    // Update stats
    const updates = {
      elo: eloResult.newElo,
      rank: eloResult.newRank,
      peak_elo: Math.max(stats.peak_elo, eloResult.newElo),
      wins: stats.wins + (result === 'win' ? 1 : 0),
      losses: stats.losses + (result === 'loss' ? 1 : 0),
      draws: stats.draws + (result === 'draw' ? 1 : 0),
      total_matches: stats.total_matches + 1,
      current_win_streak: currentWinStreak,
      longest_win_streak: longestWinStreak,
      avg_match_duration: Math.round(
        ((stats.avg_match_duration || 0) * stats.total_matches + duration) / (stats.total_matches + 1)
      ),
    };

    const { data, error } = await supabase
      .from('game_stats')
      .update(updates)
      .eq('id', stats.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating game stats:', error);
      return null;
    }

    // Award XP to player
    await this.awardXP(playerId, XP_REWARDS[result.toUpperCase() as keyof typeof XP_REWARDS]);

    return data;
  }

  /**
   * Award XP to player and update level
   */
  async awardXP(playerId: string, xp: number): Promise<void> {
    const profile = await this.getPlayerProfile(playerId);
    if (!profile) return;

    const newXP = profile.xp + xp;
    const newLevel = calculateLevel(newXP);

    await supabase
      .from('player_profiles')
      .update({
        xp: newXP,
        level: newLevel,
      })
      .eq('id', playerId);
  }

  /**
   * Save match to history
   */
  async saveMatchHistory(match: Omit<MatchHistory, 'id' | 'createdAt'>): Promise<void> {
    const { error } = await supabase
      .from('match_history')
      .insert(match);

    if (error) {
      console.error('Error saving match history:', error);
    }
  }

  /**
   * Get player's match history
   */
  async getMatchHistory(playerId: string, limit: number = 10): Promise<MatchHistory[]> {
    const { data, error } = await supabase
      .from('match_history')
      .select('*')
      .contains('players', [{ id: playerId }])
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching match history:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get leaderboard for a game type
   */
  async getLeaderboard(gameType: GameType, limit: number = 100) {
    const { data, error } = await supabase
      .from('game_stats')
      .select(`
        *,
        player:player_profiles(*)
      `)
      .eq('game_type', gameType)
      .order('elo', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching leaderboard:', error);
      return [];
    }

    return data;
  }

  /**
   * Get player's achievements
   */
  async getPlayerAchievements(playerId: string): Promise<PlayerAchievement[]> {
    const { data, error } = await supabase
      .from('player_achievements')
      .select(`
        *,
        achievement:achievements(*)
      `)
      .eq('player_id', playerId)
      .order('unlocked_at', { ascending: false });

    if (error) {
      console.error('Error fetching achievements:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Unlock achievement for player
   */
  async unlockAchievement(playerId: string, achievementCode: string): Promise<void> {
    // Get achievement
    const { data: achievement } = await supabase
      .from('achievements')
      .select('*')
      .eq('code', achievementCode)
      .single();

    if (!achievement) return;

    // Check if already unlocked
    const { data: existing } = await supabase
      .from('player_achievements')
      .select('*')
      .eq('player_id', playerId)
      .eq('achievement_id', achievement.id)
      .single();

    if (existing) return; // Already unlocked

    // Unlock achievement
    await supabase
      .from('player_achievements')
      .insert({
        player_id: playerId,
        achievement_id: achievement.id,
      });

    // Award XP
    await this.awardXP(playerId, achievement.xp_reward);
  }
}

// Singleton instance
export const playerService = new PlayerService();
