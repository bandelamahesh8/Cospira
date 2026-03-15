/**
 * RulesEngine.ts
 * Pure validator — takes (state, action) -> {valid, reason}
 */

import { GameState } from '@/types/websocket';
import { TokenController } from './TokenController';

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

export type GameAction =
  | { type: 'REQUEST_ROLL'; playerId: string }
  | { type: 'MOVE_TOKEN'; playerId: string; tokenId: number; fromCell: number; toCell: number }
  | { type: 'STATE_SYNC_REQUEST'; fromSeq: number };

export class RulesEngine {
  /**
   * Validates a game action against the current state
   */
  static validate(state: GameState, action: GameAction): ValidationResult {
    switch (action.type) {
      case 'REQUEST_ROLL':
        return this.validateRoll(state, action.playerId);
      case 'MOVE_TOKEN':
        return this.validateMove(state, action);
      default:
        return { valid: true };
    }
  }

  private static validateRoll(state: GameState, playerId: string): ValidationResult {
    if (state.currentTurn !== playerId) {
      return { valid: false, reason: 'Not your turn' };
    }
    if (state.diceRolled) {
      return { valid: false, reason: 'Already rolled' };
    }
    return { valid: true };
  }

  private static validateMove(
    state: GameState,
    action: { playerId: string; tokenId: number; fromCell: number; toCell: number }
  ): ValidationResult {
    const { playerId, tokenId } = action;

    if (state.currentTurn !== playerId) {
      return { valid: false, reason: 'Not your turn' };
    }

    if (!state.diceRolled) {
      return { valid: false, reason: 'Roll dice first' };
    }

    const player = state.players.find((p) => p.id === playerId);
    if (!player || !player.color) {
      return { valid: false, reason: 'Player or color not found' };
    }

    const tokens = state.tokens?.[player.color];
    if (!tokens || tokens[tokenId] === undefined) {
      return { valid: false, reason: 'Token not found' };
    }

    if (tokens[tokenId] !== action.fromCell) {
      return { valid: false, reason: 'Token position desync' };
    }

    const diceValue = state.diceValue || 0;

    // Core Rules from Audit
    if (tokens[tokenId] === TokenController.YARD_POS) {
      if (diceValue !== 6) {
        return { valid: false, reason: 'Need a 6 to enter board' };
      }
    } else {
      // Check for overshoot (Strict Variant A)
      if (tokens[tokenId] + diceValue > TokenController.FINISHED_POS) {
        return { valid: false, reason: 'Cannot move beyond home' };
      }

      // Block check (Audit M4) - Cannot pass opponent block
      // A block is 2+ tokens of same color on a cell
      if (!this.canPassPath(state, player.color, tokens[tokenId], diceValue)) {
        return { valid: false, reason: 'Path blocked by opponent' };
      }
    }

    return { valid: true };
  }

  /**
   * Checks if path is clear of opponent blocks
   */
  private static canPassPath(
    state: GameState,
    myColor: string,
    currentPos: number,
    steps: number
  ): boolean {
    if (!state.tokens) return true;

    for (let i = 1; i <= steps; i++) {
      const nextPos = currentPos + i;
      if (nextPos >= TokenController.BOARD_CELLS) break; // Home stretch has no blocks

      const globalIdx = TokenController.getGlobalIndex(nextPos, myColor);
      if (globalIdx === null) continue;

      // Check every color for a block on this cell
      for (const color in state.tokens) {
        if (color === myColor) continue;

        const opponentTokens = state.tokens[color];
        const tokensOnCell = opponentTokens.filter((pos) => {
          const gIdx = TokenController.getGlobalIndex(pos, color);
          return gIdx === globalIdx;
        });

        if (tokensOnCell.length >= 2) return false; // Block detected
      }
    }
    return true;
  }

  static isTerminal(state: GameState): boolean {
    if (!state.tokens) return false;
    let finishedPlayers = 0;
    for (const color in state.tokens) {
      if (state.tokens[color].every((pos) => pos === TokenController.FINISHED_POS)) {
        finishedPlayers++;
      }
    }
    // Game ends when 3 players finish (or N-1 players)
    return finishedPlayers >= Math.max(1, state.players.length - 1);
  }

  static getWinner(state: GameState): string | null {
    if (!state.tokens) return null;
    for (const color in state.tokens) {
      if (state.tokens[color].every((pos) => pos === TokenController.FINISHED_POS)) {
        const player = state.players.find((p) => p.color === color);
        return player?.id || null;
      }
    }
    return null;
  }
}
