/**
 * Canonical Data Model for Snake & Ladder
 * Based on Engineering Specification v2.0
 */

export type PlayerId = string;
export type HexColor = string; // e.g., "#EF4444"
export type ISOTimestamp = number; // Unix ms

export type GamePhase = 'WAITING' | 'ACTIVE' | 'COMPLETE';

export type MoveOutcome = 'NORMAL' | 'SNAKE' | 'LADDER' | 'WIN' | 'OVERSHOOT' | 'BLOCKED';

export interface PlayerState {
  id: PlayerId;
  displayName: string;
  position: number;           // 0 = not yet entered; 1–100 = on board
  isSpectator: boolean;
  tokenColor: HexColor;
  rollHistory: number[];
  consecutiveSixes: number;   // reset on non-six; cancel turn at 3
  joinTimestamp: ISOTimestamp;
  isConnected: boolean;
  lastActivityAt: ISOTimestamp;
}

export interface BoardConfig {
  snakes: Record<number, number>;    // head → tail
  ladders: Record<number, number>;   // base → top
  totalCells: number;                // default: 100
}

export interface GameState {
  roomId: string;
  hostId: PlayerId;
  players: PlayerState[];
  boardConfig: BoardConfig;
  currentPlayerId: PlayerId;
  phase: GamePhase;
  turnCount: number;
  winnerId: PlayerId | null;
  sequenceId: number;               // monotonic event counter
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
  dice?: number;                    // Last rolled dice
  lastAction?: {
    type: string;
    playerId: string;
    effect?: MoveOutcome;
  };
}

export interface StateDelta {
  playerId?: PlayerId;
  fromPosition?: number;
  toPosition?: number;
  outcome?: MoveOutcome;
  diceValue?: number;
  nextPlayerId?: PlayerId;
  winnerId?: PlayerId;
}

export type GameAction =
  | 'REQUEST_ROLL'
  | 'ROLL_RESULT'
  | 'SNAKE_BITE'
  | 'LADDER_CLIMB'
  | 'OVERSHOOT'
  | 'TURN_SKIPPED'
  | 'TURN_CANCELLED'
  | 'PLAYER_JOINED'
  | 'PLAYER_LEFT'
  | 'PLAYER_RECONNECTED'
  | 'GAME_WIN'
  | 'GAME_RESET'
  | 'HOST_MIGRATED'
  | 'KEY_ROTATED'
  | 'STATE_SYNC'
  | 'GAME_ERROR'
  | 'HMAC_VERIFICATION_FAILED';
