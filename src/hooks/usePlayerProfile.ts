import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { playerService } from '@/services/PlayerService';
import { useGameStore } from '@/stores/gameStore';
import {
  PlayerProfile,
  GameStats,
  GameType,
  MatchHistory,
  PlayerAchievement,
} from '@/types/player';

/**
 * usePlayerProfile Hook
 * 
 * Manages player profile state and provides methods for
 * fetching and updating player data.
 */
export function usePlayerProfile() {
  const { user } = useAuth();
  const { playerProfile, setPlayerProfile } = useGameStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const profile = await playerService.getPlayerProfile(user.id);
        
        if (profile) {
          setPlayerProfile(profile);
        } else {
          // Create profile if doesn't exist
          const newProfile = await playerService.upsertPlayerProfile({
            id: user.id,
            username: user.email?.split('@')[0] || `user_${user.id.slice(0, 8)}`,
            displayName: user.user_metadata?.display_name,
            avatarUrl: user.user_metadata?.avatar_url,
          });
          
          if (newProfile) {
            setPlayerProfile(newProfile);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [user?.id, setPlayerProfile]);

  /**
   * Update player profile
   */
  const updateProfile = async (updates: Partial<PlayerProfile>) => {
    if (!user?.id) return null;

    try {
      const updated = await playerService.upsertPlayerProfile({
        ...playerProfile,
        ...updates,
        id: user.id,
      });

      if (updated) {
        setPlayerProfile(updated);
      }

      return updated;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
      return null;
    }
  };

  return {
    profile: playerProfile,
    loading,
    error,
    updateProfile,
  };
}

/**
 * useGameStats Hook
 * 
 * Manages game statistics for a specific game type
 */
export function useGameStats(gameType: GameType) {
  const { user } = useAuth();
  const { gameStats, updateGameStats } = useGameStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const stats = gameStats[gameType];

  useEffect(() => {
    async function fetchStats() {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        let fetchedStats = await playerService.getGameStats(user.id, gameType);

        if (!fetchedStats) {
          // Initialize stats if they don't exist
          fetchedStats = await playerService.initializeGameStats(user.id, gameType);
        }

        if (fetchedStats) {
          updateGameStats(gameType, fetchedStats);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load stats');
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [user?.id, gameType, updateGameStats]);

  return {
    stats,
    loading,
    error,
  };
}

/**
 * useMatchHistory Hook
 * 
 * Fetches and manages match history for the current player
 */
export function useMatchHistory(limit: number = 10) {
  const { user } = useAuth();
  const [matches, setMatches] = useState<MatchHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHistory() {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const history = await playerService.getMatchHistory(user.id, limit);
        setMatches(history);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load match history');
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, [user?.id, limit]);

  return {
    matches,
    loading,
    error,
  };
}

/**
 * usePlayerAchievements Hook
 * 
 * Manages player achievements
 */
export function usePlayerAchievements() {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<PlayerAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAchievements() {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const playerAchievements = await playerService.getPlayerAchievements(user.id);
        setAchievements(playerAchievements);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load achievements');
      } finally {
        setLoading(false);
      }
    }

    fetchAchievements();
  }, [user?.id]);

  /**
   * Unlock an achievement
   */
  const unlockAchievement = async (achievementCode: string) => {
    if (!user?.id) return;

    try {
      await playerService.unlockAchievement(user.id, achievementCode);
      // Refresh achievements
      const updated = await playerService.getPlayerAchievements(user.id);
      setAchievements(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unlock achievement');
    }
  };

  return {
    achievements,
    loading,
    error,
    unlockAchievement,
  };
}

/**
 * useLeaderboard Hook
 * 
 * Fetches leaderboard for a specific game type
 */
export function useLeaderboard(gameType: GameType, limit: number = 100) {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        setLoading(true);
        const data = await playerService.getLeaderboard(gameType, limit);
        setLeaderboard(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
      } finally {
        setLoading(false);
      }
    }

    fetchLeaderboard();
  }, [gameType, limit]);

  return {
    leaderboard,
    loading,
    error,
  };
}
