import { GameState, PlayerId, StateDelta, MoveOutcome } from '../types';
import { DiceEngine } from './DiceEngine';
import { GameError } from '../errors/GameError';

export class MoveProcessor {
  static resolve(state: GameState, playerId: PlayerId, diceValue: number): StateDelta {
    // Step 1: Validate turn ownership
    if (state.currentPlayerId !== playerId) {
      throw new GameError('NOT_YOUR_TURN', 'It is not your turn to roll the dice.');
    }

    // Step 2: Validate diceValue
    if (!DiceEngine.isValid(diceValue)) {
      throw new GameError('INVALID_DICE', `Invalid dice value: ${diceValue}`);
    }

    const player = state.players.find(p => p.id === playerId)!;
    const currentPosition = player.position;

    // Step 3: Check triple-six penalty
    if (player.consecutiveSixes === 2 && diceValue === 6) {
      // revert position, reset counter, advance turn
      player.position = currentPosition; // assume pre-turn position, but since immutable, handle in delta
      player.consecutiveSixes = 0;
      const nextPlayer = this.getNextPlayer(state);
      return {
        playerId,
        outcome: 'BLOCKED',
        nextPlayerId: nextPlayer.id
      };
    }

    // Step 4: Entry check
    if (currentPosition === 0 && diceValue !== 6) {
      const nextPlayer = this.getNextPlayer(state);
      return {
        playerId,
        outcome: 'BLOCKED',
        nextPlayerId: nextPlayer.id
      };
    }

    // Step 5: Compute rawPosition
    const rawPosition = currentPosition + diceValue;

    // Step 6: Overshoot check
    if (rawPosition > 100) {
      const nextPlayer = this.getNextPlayer(state);
      return {
        playerId,
        fromPosition: currentPosition,
        toPosition: currentPosition, // no move
        outcome: 'OVERSHOOT',
        diceValue,
        nextPlayerId: nextPlayer.id
      };
    }

    // Step 7: Win check
    if (rawPosition === 100) {
      return {
        playerId,
        fromPosition: currentPosition,
        toPosition: 100,
        outcome: 'WIN',
        diceValue,
        winnerId: playerId
      };
    }

    let finalPosition = rawPosition;
    let outcome: MoveOutcome = 'NORMAL';

    // Step 8: Snake resolution
    if (rawPosition in state.boardConfig.snakes) {
      finalPosition = state.boardConfig.snakes[rawPosition];
      outcome = 'SNAKE';
    }
    // Step 9: Ladder resolution (only if step 8 did not trigger)
    else if (rawPosition in state.boardConfig.ladders) {
      finalPosition = state.boardConfig.ladders[rawPosition];
      outcome = 'LADDER';
    }

    // Step 10-12: Advance turn, etc.
    let nextPlayerId = playerId;
    if (diceValue === 6) {
      player.consecutiveSixes++;
    } else {
      nextPlayerId = this.getNextPlayer(state).id;
      player.consecutiveSixes = 0;
    }

    return {
      playerId,
      fromPosition: currentPosition,
      toPosition: finalPosition,
      outcome,
      diceValue,
      nextPlayerId
    };
  }

  private static getNextPlayer(state: GameState): { id: PlayerId } {
    // Rotate in joinTimestamp ascending order, skip spectators/disconnected
    const activePlayers = state.players
      .filter(p => !p.isSpectator && p.isConnected)
      .sort((a, b) => a.joinTimestamp - b.joinTimestamp);
    const currentIndex = activePlayers.findIndex(p => p.id === state.currentPlayerId);
    const nextIndex = (currentIndex + 1) % activePlayers.length;
    return activePlayers[nextIndex];
  }
}