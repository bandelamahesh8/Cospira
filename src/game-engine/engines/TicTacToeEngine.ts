import { BaseGameEngine } from '../core/BaseGameEngine';
import {
  GameState,
  Move,
  Player,
  ValidationResult,
  WinnerResult,
} from '../core/GameEngine.interface';

type CellValue = 'X' | 'O' | null;
type Board = CellValue[];

/**
 * Tic-Tac-Toe Game Engine
 *
 * Implements the universal GameEngine interface for Tic-Tac-Toe.
 * Supports standard 3x3 board with win detection.
 */
export class TicTacToeEngine extends BaseGameEngine {
  private readonly BOARD_SIZE = 9;
  private readonly WIN_PATTERNS = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8], // Rows
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8], // Columns
    [0, 4, 8],
    [2, 4, 6], // Diagonals
  ];

  initGame(players: Player[]): GameState {
    if (players.length !== 2) {
      throw new Error('Tic-Tac-Toe requires exactly 2 players');
    }

    const gameState: GameState = {
      id: this.generateGameId(),
      type: 'xoxo',
      players: players.map((p, i) => ({
        ...p,
        role: i === 0 ? 'X' : 'O',
      })),
      currentTurn: players[0].id,
      status: 'active',
      winner: null,
      board: Array(this.BOARD_SIZE).fill(null),
      metadata: {
        moveHistory: [],
        moveCount: 0,
        isTimeAttack: false, // Default false, can be enabled via config
        turnStartTime: Date.now(),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.state = gameState;
    return gameState;
  }

  // Method to enable Time Attack (would be called during setup)
  enableTimeAttack(state: GameState): GameState {
    state.metadata.isTimeAttack = true;
    state.metadata.turnStartTime = Date.now();
    return state;
  }

  validateMove(move: Move, state: GameState): ValidationResult {
    const { index } = move.data as { index: number };

    // Check if it's the player's turn
    if (move.playerId !== state.currentTurn) {
      return { valid: false, reason: 'Not your turn' };
    }

    // Check if index is valid
    if (index < 0 || index >= this.BOARD_SIZE) {
      return { valid: false, reason: 'Invalid board position' };
    }

    // Check if cell is empty
    const board = state.board as Board;
    if (board[index] !== null) {
      return { valid: false, reason: 'Cell already occupied' };
    }

    // Check if game is still active
    if (state.status !== 'active') {
      return { valid: false, reason: 'Game is not active' };
    }

    // Check for Time Attack Timeout
    // NOTE: We only enforce this if explicitly set.
    // Usually the client enforces visuals, but server can reject late moves.
    // We'll increase grace period to 30s for normal play or respect specific timeAttack value.
    if (state.metadata.isTimeAttack && state.metadata.turnStartTime) {
      const turnStartTime = state.metadata.turnStartTime as number;
      const elapsed = Date.now() - turnStartTime;
      const limit = 30000; // 30 seconds
      if (elapsed > limit) {
        // ...
      }
    }

    return { valid: true };
  }

  applyMove(move: Move, state: GameState): GameState {
    const { index } = move.data as { index: number };
    const board = [...(state.board as Board)];
    const player = state.players.find((p) => p.id === move.playerId);

    if (!player || !player.role) {
      throw new Error('Invalid player');
    }

    board[index] = player.role as CellValue;

    const newState: GameState = {
      ...state,
      board,
      currentTurn: this.getNextPlayer(state),
      metadata: {
        ...state.metadata,
        moveHistory: [
          ...(state.metadata.moveHistory as unknown[]),
          { playerId: move.playerId, index },
        ],
        moveCount: (state.metadata.moveCount as number) + 1,
        turnStartTime: Date.now(),
      },
      updatedAt: new Date(),
    };

    // Check if game is finished
    const winnerCheck = this.checkWinner(newState);
    if (winnerCheck.finished) {
      newState.status = 'finished';
      newState.winner = winnerCheck.winner;
    }

    this.state = newState;
    return newState;
  }

  checkWinner(state: GameState): WinnerResult {
    const board = state.board as Board;

    // Check all win patterns
    for (const pattern of this.WIN_PATTERNS) {
      const [a, b, c] = pattern;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        const winner = state.players.find((p) => p.role === board[a]);
        return { finished: true, winner: winner?.id || null };
      }
    }

    // Check for draw (board full)
    if (board.every((cell) => cell !== null)) {
      return { finished: true, winner: 'draw' };
    }

    return { finished: false, winner: null };
  }

  getValidMoves(state: GameState): Move[] {
    const board = state.board as Board;
    const validMoves: Move[] = [];

    board.forEach((cell, index) => {
      if (cell === null) {
        validMoves.push({
          playerId: state.currentTurn,
          type: 'move',
          data: { index },
          timestamp: Date.now(),
        });
      }
    });

    return validMoves;
  }

  /**
   * Get AI move using minimax algorithm (for future AI opponent)
   */
  getAIMove(state: GameState, _difficulty: 'easy' | 'medium' | 'hard'): Move | null {
    const validMoves = this.getValidMoves(state);

    if (validMoves.length === 0) return null;

    // For now, return random move (implement minimax later)
    const randomIndex = Math.floor(Math.random() * validMoves.length);
    return validMoves[randomIndex];
  }
}
