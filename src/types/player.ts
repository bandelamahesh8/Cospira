/**
 * Player Profile and Game Statistics Types
 *
 * Core types for the player profile system, game statistics,
 * match history, and achievements.
 */

import { GameState, Move } from '../game-engine/core/GameEngine.interface';

export type GameType = 'chess' | 'xoxo' | 'ludo' | 'snakeladder' | 'connect4' | 'checkers';
export type Rank = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond' | 'Master' | 'Legend';
export type MatchMode = 'casual' | 'ranked' | 'tournament' | 'private';

/**
 * Player Profile
 */
export interface PlayerProfile {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  level: number;
  xp: number;
  title: string;
  bio?: string;
  countryCode?: string;
  createdAt: Date;
  updatedAt: Date;
  lastSeen: Date;

  // Phase 5: Social & Economy
  coins: number;
  isOnline: boolean;

  // Equipped Assets
  equipped_avatar_id?: string;
  equipped_frame_id?: string;
  equipped_banner_id?: string;
}

/**
 * Game Statistics per Player per Game Type
 */
export interface GameStats {
  id: string;
  playerId: string;
  gameType: GameType;

  // ELO & Ranking
  elo: number;
  rank: Rank;
  peakElo: number;

  // Match Statistics
  wins: number;
  losses: number;
  draws: number;
  totalMatches: number;
  winRate: number;

  // Performance Metrics
  avgMatchDuration?: number; // in seconds
  longestWinStreak: number;
  currentWinStreak: number;

  // Game-specific stats (flexible)
  gameSpecificStats: Record<string, unknown>;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Match History Record
 */
export interface MatchHistory {
  id: string;
  gameType: GameType;
  mode: MatchMode;

  // Players
  players: Array<{
    id: string;
    name: string;
    role?: string;
    elo?: number;
  }>;
  winnerId?: string;

  // Match Data
  initialState: GameState; // GameState
  finalState: GameState; // GameState
  moveHistory: Move[]; // Move[]

  // Metadata
  duration: number; // in seconds
  eloChanges?: Record<string, number>;

  createdAt: Date;
  endedAt?: Date;
}

/**
 * Achievement Definition
 */
export interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
  iconUrl?: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  xpReward: number;
  createdAt: Date;
}

/**
 * Player Achievement (Unlocked)
 */
export interface PlayerAchievement {
  id: string;
  playerId: string;
  achievementId: string;
  achievement?: Achievement;
  unlockedAt: Date;
}

/**
 * ELO Calculation Result
 */
export interface ELOResult {
  newElo: number;
  change: number;
  newRank: Rank;
}

/**
 * Leaderboard Entry
 */
export interface LeaderboardEntry {
  rank: number;
  player: PlayerProfile;
  stats: GameStats;
}

/**
 * XP and Level Configuration
 */
export const XP_PER_LEVEL = 1000;
export const XP_REWARDS = {
  WIN: 50,
  DRAW: 20,
  LOSS: 10,
  DAILY_LOGIN: 25,
  ACHIEVEMENT: 100,
  TOURNAMENT_WIN: 500,
};

/**
 * ELO Configuration
 */
export const ELO_CONFIG = {
  DEFAULT_ELO: 1000,
  K_FACTOR: 32,
  RANK_THRESHOLDS: {
    Bronze: 0,
    Silver: 800,
    Gold: 1200,
    Platinum: 1600,
    Diamond: 2000,
    Master: 2400,
    Legend: 2800,
  },
};

/**
 * Helper function to calculate level from XP
 */
export function calculateLevel(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

/**
 * Helper function to get rank from ELO
 */
export function getRankFromElo(elo: number): Rank {
  if (elo >= ELO_CONFIG.RANK_THRESHOLDS.Legend) return 'Legend';
  if (elo >= ELO_CONFIG.RANK_THRESHOLDS.Master) return 'Master';
  if (elo >= ELO_CONFIG.RANK_THRESHOLDS.Diamond) return 'Diamond';
  if (elo >= ELO_CONFIG.RANK_THRESHOLDS.Platinum) return 'Platinum';
  if (elo >= ELO_CONFIG.RANK_THRESHOLDS.Gold) return 'Gold';
  if (elo >= ELO_CONFIG.RANK_THRESHOLDS.Silver) return 'Silver';
  return 'Bronze';
}

/**
 * Game Replay
 */
export interface GameReplay {
  id: string;
  match_id: string;
  game_type: GameType;
  initial_state: GameState;
  move_history: Move[];
  final_state: GameState;
  winner_id?: string;
  duration?: number;
  created_at: string;
}
