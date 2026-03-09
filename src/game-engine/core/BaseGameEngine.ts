import {
  GameEngine,
  GameState,
  GameStats,
  Move,
  Player,
  ValidationResult,
  WinnerResult,
} from './GameEngine.interface';

/**
 * Base Game Engine Implementation
 *
 * Provides common functionality for all game engines.
 * Game-specific engines extend this class.
 */
export abstract class BaseGameEngine implements GameEngine {
  protected state: GameState;

  constructor() {
    this.state = this.createEmptyState();
  }

  /**
   * Abstract methods that must be implemented by game-specific engines
   */
  abstract initGame(players: Player[], config?: unknown): GameState;
  abstract validateMove(move: Move, state: GameState): ValidationResult;
  abstract applyMove(move: Move, state: GameState): GameState;
  abstract checkWinner(state: GameState): WinnerResult;
  abstract getValidMoves(state: GameState): Move[];

  /**
   * Common implementations
   */
  getState(): GameState {
    return { ...this.state };
  }

  serialize(state: GameState): string {
    return JSON.stringify({
      ...state,
      createdAt: state.createdAt.toISOString(),
      updatedAt: state.updatedAt.toISOString(),
    });
  }

  deserialize(data: string): GameState {
    const parsed = JSON.parse(data);
    return {
      ...parsed,
      createdAt: new Date(parsed.createdAt),
      updatedAt: new Date(parsed.updatedAt),
    };
  }

  calculateStats(state: GameState): GameStats {
    const duration = Date.now() - state.createdAt.getTime();
    const moveHistory = state.metadata.moveHistory as unknown[];
    const totalMoves = moveHistory?.length || 0;

    return {
      duration,
      totalMoves,
    };
  }

  /**
   * Helper methods
   */
  protected createEmptyState(): GameState {
    return {
      id: '',
      type: '',
      players: [],
      currentTurn: '',
      status: 'waiting',
      winner: null,
      board: null,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  protected generateGameId(): string {
    return `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  protected getNextPlayer(state: GameState): string {
    const currentIndex = state.players.findIndex((p) => p.id === state.currentTurn);
    const nextIndex = (currentIndex + 1) % state.players.length;
    return state.players[nextIndex].id;
  }

  protected updateState(updates: Partial<GameState>): GameState {
    this.state = {
      ...this.state,
      ...updates,
      updatedAt: new Date(),
    };
    return this.state;
  }
}
