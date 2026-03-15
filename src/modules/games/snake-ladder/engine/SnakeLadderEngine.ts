import { GameState, PlayerId, GamePhase } from '../types';
import { BoardStateManager } from './BoardStateManager';
import { MoveProcessor } from './MoveProcessor';
import { DiceEngine } from './DiceEngine';
import { GameError } from '../errors/GameError';

export class SnakeLadderEngine {
  private stateManager: BoardStateManager;

  constructor(initialState: GameState) {
    this.stateManager = new BoardStateManager(initialState);
  }

  getState(): GameState {
    return this.stateManager.getState();
  }

  processRoll(playerId: PlayerId): { diceValue: number; delta: any } {
    if (this.getState().phase !== 'ACTIVE') {
      throw new GameError('GAME_NOT_ACTIVE', 'Game is not in active phase.');
    }

    const diceValue = DiceEngine.roll();
    const delta = MoveProcessor.resolve(this.getState(), playerId, diceValue);
    this.stateManager.applyDelta(delta);

    return { diceValue, delta };
  }

  // Other methods for joining, starting game, etc.
  startGame(): void {
    const state = this.getState();
    if (state.players.length < 2) {
      throw new GameError('INSUFFICIENT_PLAYERS', 'Need at least 2 players to start.');
    }
    // Set phase to ACTIVE, set currentPlayerId to first
    const firstPlayer = state.players
      .filter((p) => !p.isSpectator)
      .sort((a, b) => a.joinTimestamp - b.joinTimestamp)[0];
    this.stateManager.applyDelta({ nextPlayerId: firstPlayer.id });
    // Update phase
    const newState = this.getState();
    newState.phase = 'ACTIVE';
    this.stateManager = new BoardStateManager(newState);
  }
}
