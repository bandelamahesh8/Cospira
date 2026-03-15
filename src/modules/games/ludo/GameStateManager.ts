/**
 * GameStateManager.ts
 * Immutable state store, optimistic update support, snapshot/restore
 */

import { GameState } from '@/types/websocket';

export class GameStateManager {
  private state: GameState;
  private history: GameState[] = [];
  private readonly MAX_HISTORY = 10;

  constructor(initialState: GameState) {
    this.state = JSON.parse(JSON.stringify(initialState));
  }

  /**
   * Returns current state (readonly copy)
   */
  getState(): GameState {
    return JSON.parse(JSON.stringify(this.state));
  }

  /**
   * Updates state with internal history tracking
   */
  update(newState: Partial<GameState>) {
    // Keep history
    this.history.push(this.getState());
    if (this.history.length > this.MAX_HISTORY) {
      this.history.shift();
    }

    // Merge new state
    this.state = {
      ...this.state,
      ...newState,
      seq: (this.state.seq || 0) + 1,
    };
  }

  /**
   * Restore to a previous snapshot
   */
  restore(snapshot: GameState) {
    this.state = JSON.parse(JSON.stringify(snapshot));
    this.history = [];
  }

  /**
   * Undo last local operation (optimistic revert)
   */
  undo(): boolean {
    const previous = this.history.pop();
    if (previous) {
      this.state = previous;
      return true;
    }
    return false;
  }
}
