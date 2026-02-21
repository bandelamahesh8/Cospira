import { GameType } from '../src/types/player';

/**
 * Matchmaking Types
 */

export type MatchMode = 'ranked' | 'casual';

export interface QueueEntry {
  playerId: string;
  playerName: string;
  gameType: GameType;
  mode: MatchMode;
  elo: number;
  joinedAt: number;
  socketId: string;
}

export interface MatchResult {
  roomId: string;
  player1: QueueEntry;
  player2: QueueEntry;
  gameType: GameType;
  mode: MatchMode;
}

export interface QueueStatus {
  position: number;
  estimatedWait: number;
  playersInQueue: number;
}
