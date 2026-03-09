import { supabase } from '@/integrations/supabase/client';
import {
  PlayerProfile,
  GameStats,
  GameType,
  Rank,
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

    if (!data) return null;

    return {
      id: data.id,
      username: data.username,
      displayName: data.display_name || undefined,
      avatarUrl: data.avatar_url || undefined,
      level: data.level,
      xp: data.xp,
      title: '', // Added title as required by interface
      coins: data.coins,
      isOnline: data.is_online,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      lastSeen: new Date(data.updated_at), // Using updatedAt as fallback for lastSeen
      equipped_avatar_id: data.equipped_avatar_id || undefined,
      equipped_frame_id: data.equipped_frame_id || undefined,
      equipped_banner_id: data.equipped_banner_id || undefined,
    };
  }

  /**
   * Create or update player profile
   */
  async upsertPlayerProfile(profile: Partial<PlayerProfile>): Promise<PlayerProfile | null> {
    const mapped: Record<string, unknown> = { ...profile };
    if (profile.displayName) {
      mapped.display_name = profile.displayName;
      delete mapped.displayName;
    }
    if (profile.avatarUrl) {
      mapped.avatar_url = profile.avatarUrl;
      delete mapped.avatarUrl;
    }
    if (profile.isOnline !== undefined) {
      mapped.is_online = profile.isOnline;
      delete mapped.isOnline;
    }
    // Remove Date objects as Supabase expect strings/auto-populates
    delete mapped.createdAt;
    delete mapped.updatedAt;
    delete mapped.lastSeen;

    if (!mapped.id) return null;

    const { data, error } = await supabase
      .from('player_profiles')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .upsert(mapped as any)
      .select()
      .single();

    if (error) {
      console.error('Error upserting player profile:', error);
      return null;
    }

    return {
      id: data.id,
      username: data.username,
      displayName: data.display_name || undefined,
      avatarUrl: data.avatar_url || undefined,
      level: data.level,
      xp: data.xp,
      title: '',
      coins: data.coins,
      isOnline: data.is_online,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      lastSeen: new Date(data.updated_at),
      equipped_avatar_id: data.equipped_avatar_id || undefined,
      equipped_frame_id: data.equipped_frame_id || undefined,
      equipped_banner_id: data.equipped_banner_id || undefined,
    };
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

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned
      console.error('Error fetching game stats:', error);
      return null;
    }

    if (!data) return null;

    return {
      id: data.id,
      playerId: data.player_id,
      gameType: data.game_type as GameType,
      elo: data.elo,
      rank: data.rank as Rank,
      peakElo: data.peak_elo,
      wins: data.wins,
      losses: data.losses,
      draws: data.draws,
      totalMatches: data.total_matches,
      winRate: data.total_matches > 0 ? (data.wins / data.total_matches) * 100 : 0,
      avgMatchDuration: data.avg_match_duration,
      longestWinStreak: data.longest_win_streak,
      currentWinStreak: data.current_win_streak,
      gameSpecificStats: {},
      createdAt: new Date(),
      updatedAt: new Date(data.last_played_at),
    };
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

    return {
      id: data.id,
      playerId: data.player_id,
      gameType: data.game_type as GameType,
      elo: data.elo,
      rank: data.rank as Rank,
      peakElo: data.peak_elo,
      wins: data.wins,
      losses: data.losses,
      draws: data.draws,
      totalMatches: data.total_matches,
      winRate: 0,
      avgMatchDuration: data.avg_match_duration,
      longestWinStreak: data.longest_win_streak,
      currentWinStreak: data.current_win_streak,
      gameSpecificStats: {},
      createdAt: new Date(),
      updatedAt: new Date(data.last_played_at),
    };
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
    const currentWinStreak = result === 'win' ? stats.currentWinStreak + 1 : 0;
    const longestWinStreak = Math.max(stats.longestWinStreak, currentWinStreak);

    // Update stats
    const updates = {
      elo: eloResult.newElo,
      rank: eloResult.newRank,
      peak_elo: Math.max(stats.peakElo, eloResult.newElo),
      wins: stats.wins + (result === 'win' ? 1 : 0),
      losses: stats.losses + (result === 'loss' ? 1 : 0),
      draws: stats.draws + (result === 'draw' ? 1 : 0),
      total_matches: stats.totalMatches + 1,
      current_win_streak: currentWinStreak,
      longest_win_streak: longestWinStreak,
      avg_match_duration: Math.round(
        ((stats.avgMatchDuration || 0) * stats.totalMatches + duration) / (stats.totalMatches + 1)
      ),
      last_played_at: new Date().toISOString(),
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

    return {
      id: data.id,
      playerId: data.player_id,
      gameType: data.game_type as GameType,
      elo: data.elo,
      rank: data.rank as Rank,
      peakElo: data.peak_elo,
      wins: data.wins,
      losses: data.losses,
      draws: data.draws,
      totalMatches: data.total_matches,
      winRate: (data.wins / data.total_matches) * 100,
      avgMatchDuration: data.avg_match_duration,
      longestWinStreak: data.longest_win_streak,
      currentWinStreak: data.current_win_streak,
      gameSpecificStats: {},
      createdAt: new Date(),
      updatedAt: new Date(data.last_played_at),
    };
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('match_history' as any)
      .insert({
        game_type: match.gameType,
        players: match.players,
        winner_id: match.winnerId || null,
        initial_state: match.initialState,
        final_state: match.finalState,
        move_history: match.moveHistory,
      });

    if (error) {
      console.error('Error saving match history:', error);
    }
  }

  /**
   * Get player's match history
   */
  async getMatchHistory(playerId: string, limit: number = 10): Promise<MatchHistory[]> {
    const { data, error } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('match_history' as any)
      .select('*')
      .contains('players', [{ id: playerId }])
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching match history:', error);
      return [];
    }

    if (!data) return [];

    return (data as unknown[]).map((row) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const m = row as any;
      return {
        id: m.id,
        gameType: m.game_type as GameType,
        mode: 'casual', // Matches don't seem to store mode in DB yet
        players: m.players,
        winnerId: m.winner_id || undefined,
        initialState: m.initial_state,
        finalState: m.final_state,
        moveHistory: m.move_history,
        duration: 0, // Duration not stored in DB yet
        createdAt: new Date(m.created_at),
      };
    });
  }

  /**
   * Get leaderboard for a game type
   */
  async getLeaderboard(gameType: GameType, limit: number = 100): Promise<unknown[]> {
    const { data, error } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('game_stats' as any)
      .select(
        `
        *,
        player:player_profiles(*)
      `
      )
      .eq('game_type', gameType)
      .order('elo', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching leaderboard:', error);
      return [];
    }

    return (data as unknown[]) || [];
  }

  /**
   * Get player's achievements
   */
  async getPlayerAchievements(playerId: string): Promise<PlayerAchievement[]> {
    const { data, error } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('player_achievements' as any)
      .select(
        `
        *,
        achievement:achievements(*)
      `
      )
      .eq('player_id', playerId)
      .order('unlocked_at', { ascending: false });

    if (error) {
      console.error('Error fetching achievements:', error);
      return [];
    }

    if (!data) return [];

    return (data as unknown[]).map((row) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pa = row as any;
      return {
        id: pa.id,
        playerId: pa.player_id,
        achievementId: pa.achievement_id,
        unlockedAt: new Date(pa.unlocked_at),
        achievement: pa.achievement
          ? {
              id: pa.achievement.id,
              code: pa.achievement.code,
              name: pa.achievement.name,
              description: pa.achievement.description,
              iconUrl: pa.achievement.icon_url || undefined,
              category: pa.achievement.category,
              rarity: pa.achievement.rarity,
              points: pa.achievement.points,
              xpReward: pa.achievement.xp_reward,
              createdAt: new Date(pa.achievement.created_at),
            }
          : undefined,
      };
    });
  }

  /**
   * Unlock achievement for player
   */
  async unlockAchievement(playerId: string, achievementCode: string): Promise<void> {
    // Get achievement
    const { data: achievement } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('achievements' as any)
      .select('*')
      .eq('code', achievementCode)
      .single();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!achievement || (achievement as any).error) return;

    // Check if already unlocked
    const { data: existing } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('player_achievements' as any)
      .select('*')
      .eq('player_id', playerId)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .eq('achievement_id', (achievement as any).id)
      .single();

    if (existing) return; // Already unlocked

    // Unlock achievement
    await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('player_achievements' as any)
      .insert({
        player_id: playerId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        achievement_id: (achievement as any).id,
      });

    // Award XP
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.awardXP(playerId, (achievement as any).xp_reward);
  }
}

// Singleton instance
export const playerService = new PlayerService();
