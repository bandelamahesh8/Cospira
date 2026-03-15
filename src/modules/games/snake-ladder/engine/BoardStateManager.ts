/* eslint-disable @typescript-eslint/no-unused-vars */
import { GameState, StateDelta } from '../types';

export class BoardStateManager {
  private state: GameState;

  constructor(initialState: GameState) {
    this.state = structuredClone(initialState);
  }

  getState(): GameState {
    return structuredClone(this.state);
  }

  applyDelta(delta: StateDelta): StateDelta {
    const previousState = structuredClone(this.state);

    if (delta.playerId !== undefined) {
      const player = this.state.players.find((p) => p.id === delta.playerId);
      if (player) {
        if (delta.fromPosition !== undefined) player.position = delta.fromPosition;
        if (delta.toPosition !== undefined) player.position = delta.toPosition;
        if (delta.diceValue !== undefined) player.rollHistory.push(delta.diceValue);
        if (delta.outcome === 'NORMAL' || delta.outcome === 'SNAKE' || delta.outcome === 'LADDER') {
          // reset consecutive sixes on non-six
          if (delta.diceValue !== 6) player.consecutiveSixes = 0;
        }
      }
    }

    if (delta.nextPlayerId !== undefined) {
      this.state.currentPlayerId = delta.nextPlayerId;
    }

    if (delta.winnerId !== undefined) {
      this.state.winnerId = delta.winnerId;
      this.state.phase = 'COMPLETE';
    }

    this.state.updatedAt = Date.now();
    this.state.sequenceId++;

    return delta; // return the applied delta
  }

  // Emit delta as event, but since this is pure, just return it
}
