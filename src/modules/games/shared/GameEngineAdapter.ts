/**
 * Game engine adapter contract for all games in the platform.
 *
 * Games must implement this interface to plug into the Cospira game runtime.
 */

export type GameConfig = {
  gameId?: string;
  players: string[];
  settings?: Record<string, unknown>;
};

export type GameMove = {
  playerId: string;
  type: string;
  payload?: unknown;
};

export type GameState = unknown;

export type ValidationResult = {
  valid: boolean;
  reason?: string;
};

export type WinResult = {
  winner: 1 | 2;
  winningCells: [number, number][];
};

export interface GameEngineAdapter {
  gameId: string;
  initialize(config: GameConfig): void;
  applyMove(move: GameMove): GameState;
  validateMove(move: GameMove, state: GameState): ValidationResult;
  detectWin(state: GameState): WinResult | null;
  reset(): GameState;
  serialize(): string;
  deserialize(snapshot: string): GameState;
}
