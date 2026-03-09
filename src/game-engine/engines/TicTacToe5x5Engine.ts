import { BaseGameEngine } from '../core/BaseGameEngine';
import {
  GameState,
  Move,
  Player,
  ValidationResult,
  WinnerResult,
} from '../core/GameEngine.interface';

type CellValue = 'X' | 'O' | null;

/**
 * Tic-Tac-Toe 5x5 Engine
 * Win condition: Connect 4 in a row
 */
export class TicTacToe5x5Engine extends BaseGameEngine {
  private readonly BOARD_SIZE = 5;
  private readonly WIN_LENGTH = 4;

  initGame(players: Player[]): GameState {
    if (players.length !== 2) {
      throw new Error('Tic-Tac-Toe requires exactly 2 players');
    }

    const board: CellValue[][] = Array(this.BOARD_SIZE)
      .fill(null)
      .map(() => Array(this.BOARD_SIZE).fill(null));

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
      board,
      metadata: {
        moveCount: 0,
        boardSize: this.BOARD_SIZE,
        winLength: this.WIN_LENGTH,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.state = gameState;
    return gameState;
  }

  validateMove(move: Move, state: GameState): ValidationResult {
    if (move.playerId !== state.currentTurn) {
      return { valid: false, reason: 'Not your turn' };
    }

    const { row, col } = move.data;
    const board = state.board as CellValue[][];

    if (row < 0 || row >= this.BOARD_SIZE || col < 0 || col >= this.BOARD_SIZE) {
      return { valid: false, reason: 'Invalid position' };
    }

    if (board[row][col] !== null) {
      return { valid: false, reason: 'Cell already occupied' };
    }

    return { valid: true };
  }

  applyMove(move: Move, state: GameState): GameState {
    const board = (state.board as CellValue[][]).map((row) => [...row]);
    const { row, col } = move.data;
    const player = state.players.find((p) => p.id === move.playerId);
    const symbol = player?.role as CellValue;

    board[row][col] = symbol;

    const newState: GameState = {
      ...state,
      board,
      currentTurn: this.getNextPlayer(state),
      metadata: {
        ...state.metadata,
        moveCount: state.metadata.moveCount + 1,
      },
      updatedAt: new Date(),
    };

    const winnerCheck = this.checkWinner(newState);
    if (winnerCheck.finished) {
      newState.status = 'finished';
      newState.winner = winnerCheck.winner;
    }

    this.state = newState;
    return newState;
  }

  checkWinner(state: GameState): WinnerResult {
    const board = state.board as CellValue[][];

    // Check all possible winning combinations
    for (let row = 0; row < this.BOARD_SIZE; row++) {
      for (let col = 0; col < this.BOARD_SIZE; col++) {
        const cell = board[row][col];
        if (!cell) continue;

        // Check horizontal
        if (col <= this.BOARD_SIZE - this.WIN_LENGTH) {
          let win = true;
          for (let i = 1; i < this.WIN_LENGTH; i++) {
            if (board[row][col + i] !== cell) {
              win = false;
              break;
            }
          }
          if (win) {
            const winner = state.players.find((p) => p.role === cell);
            return { finished: true, winner: winner?.id || null };
          }
        }

        // Check vertical
        if (row <= this.BOARD_SIZE - this.WIN_LENGTH) {
          let win = true;
          for (let i = 1; i < this.WIN_LENGTH; i++) {
            if (board[row + i][col] !== cell) {
              win = false;
              break;
            }
          }
          if (win) {
            const winner = state.players.find((p) => p.role === cell);
            return { finished: true, winner: winner?.id || null };
          }
        }

        // Check diagonal (top-left to bottom-right)
        if (row <= this.BOARD_SIZE - this.WIN_LENGTH && col <= this.BOARD_SIZE - this.WIN_LENGTH) {
          let win = true;
          for (let i = 1; i < this.WIN_LENGTH; i++) {
            if (board[row + i][col + i] !== cell) {
              win = false;
              break;
            }
          }
          if (win) {
            const winner = state.players.find((p) => p.role === cell);
            return { finished: true, winner: winner?.id || null };
          }
        }

        // Check diagonal (top-right to bottom-left)
        if (row <= this.BOARD_SIZE - this.WIN_LENGTH && col >= this.WIN_LENGTH - 1) {
          let win = true;
          for (let i = 1; i < this.WIN_LENGTH; i++) {
            if (board[row + i][col - i] !== cell) {
              win = false;
              break;
            }
          }
          if (win) {
            const winner = state.players.find((p) => p.role === cell);
            return { finished: true, winner: winner?.id || null };
          }
        }
      }
    }

    // Check for draw
    const isFull = board.every((row) => row.every((cell) => cell !== null));
    if (isFull) {
      return { finished: true, winner: null, isDraw: true };
    }

    return { finished: false, winner: null };
  }

  getValidMoves(state: GameState): Move[] {
    const board = state.board as CellValue[][];
    const validMoves: Move[] = [];

    for (let row = 0; row < this.BOARD_SIZE; row++) {
      for (let col = 0; col < this.BOARD_SIZE; col++) {
        if (board[row][col] === null) {
          validMoves.push({
            playerId: state.currentTurn,
            type: 'place',
            data: { row, col },
            timestamp: Date.now(),
          });
        }
      }
    }

    return validMoves;
  }
}
