/**
 * Core Game Engine Interface
 * 
 * All games must implement this interface to ensure consistency,
 * scalability, and maintainability across the gaming ecosystem.
 */

export interface Player {
  id: string;
  name: string;
  role?: string;
  avatarUrl?: string;
  teamId?: string;
}

export interface Move {
  playerId: string;
  type: string;
  data: any;
  timestamp: number;
}

export interface GameState {
  id: string;
  type: string;
  players: Player[];
  currentTurn: string;
  status: 'waiting' | 'active' | 'paused' | 'finished';
  winner: string | 'draw' | null;
  board: any;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface GameStats {
  duration: number;
  totalMoves: number;
  [key: string]: any;
}

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

export interface WinnerResult {
  finished: boolean;
  winner: string | 'draw' | null;
}

/**
 * Universal Game Engine Interface
 * 
 * All game engines must implement these methods for:
 * - Consistent game flow
 * - Server-side validation
 * - State serialization
 * - Move validation
 */
export interface GameEngine {
  /**
   * Initialize a new game with given players and optional config
   */
  initGame(players: Player[], config?: any): GameState;

  /**
   * Validate a move before applying it
   * Server-side validation prevents cheating
   */
  validateMove(move: Move, state: GameState): ValidationResult;

  /**
   * Apply a validated move to the game state
   * Returns new immutable state
   */
  applyMove(move: Move, state: GameState): GameState;

  /**
   * Check if the game has finished and who won
   */
  checkWinner(state: GameState): WinnerResult;

  /**
   * Get current game state
   */
  getState(): GameState;

  /**
   * Serialize game state for storage/transmission
   */
  serialize(state: GameState): string;

  /**
   * Deserialize game state from storage
   */
  deserialize(data: string): GameState;

  /**
   * Get all valid moves for current player
   * Used for AI and move hints
   */
  getValidMoves(state: GameState): Move[];

  /**
   * Calculate game statistics
   */
  calculateStats(state: GameState): GameStats;
}
