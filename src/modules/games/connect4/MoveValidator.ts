/**
 * Move validation logic for Connect4.
 */

import { BoardState, Connect4Move } from './types';

export type ValidationResult = {
  valid: boolean;
  reason?: string;
};

export class MoveValidator {
  static validate(state: BoardState, move: Connect4Move, playerNumber: 1 | 2): ValidationResult {
    if (state.status !== 'active') {
      return { valid: false, reason: 'Game is not active.' };
    }

    if (playerNumber !== state.currentPlayer) {
      return { valid: false, reason: "It's not the player's turn." };
    }

    if (move.column < 0 || move.column >= state.cols) {
      return { valid: false, reason: 'Invalid column index.' };
    }

    if (state.grid[0][move.column] !== 0) {
      return { valid: false, reason: 'Column is full.' };
    }

    return { valid: true };
  }
}
