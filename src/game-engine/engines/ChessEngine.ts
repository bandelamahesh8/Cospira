import { Chess } from 'chess.js';
import { BaseGameEngine } from '../core/BaseGameEngine';
import {
  GameState,
  Move,
  Player,
  ValidationResult,
  WinnerResult,
} from '../core/GameEngine.interface';

/**
 * Chess Game Engine
 * 
 * Implements the universal GameEngine interface for chess.
 * Uses chess.js library for move validation and game logic.
 */
export class ChessEngine extends BaseGameEngine {
  private chess: Chess;

  constructor() {
    super();
    this.chess = new Chess();
  }

  initGame(players: Player[]): GameState {
    if (players.length !== 2) {
      throw new Error('Chess requires exactly 2 players');
    }

    this.chess.reset();

    const gameState: GameState = {
      id: this.generateGameId(),
      type: 'chess',
      players: players.map((p, i) => ({
        ...p,
        role: i === 0 ? 'white' : 'black',
      })),
      currentTurn: players[0].id,
      status: 'active',
      winner: null,
      board: this.chess.fen(),
      metadata: {
        moveHistory: [],
        capturedPieces: { white: [], black: [] },
        timeControl: null,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.state = gameState;
    return gameState;
  }

  validateMove(move: Move, state: GameState): ValidationResult {
    try {
      // Load current board state
      this.chess.load(state.board);

      // Verify it's the player's turn
      const player = state.players.find((p) => p.id === move.playerId);
      if (!player) {
        return { valid: false, reason: 'Player not found' };
      }

      const currentTurnColor = this.chess.turn();
      if (
        (currentTurnColor === 'w' && player.role !== 'white') ||
        (currentTurnColor === 'b' && player.role !== 'black')
      ) {
        return { valid: false, reason: 'Not your turn' };
      }

      // Validate the chess move
      const result = this.chess.move(move.data);
      if (!result) {
        return { valid: false, reason: 'Invalid chess move' };
      }

      // Undo the test move
      this.chess.undo();
      return { valid: true };
    } catch (error) {
      return { valid: false, reason: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  applyMove(move: Move, state: GameState): GameState {
    this.chess.load(state.board);
    const result = this.chess.move(move.data);

    if (!result) {
      throw new Error('Invalid move');
    }

    const newState: GameState = {
      ...state,
      board: this.chess.fen(),
      currentTurn: this.getNextPlayer(state),
      metadata: {
        ...state.metadata,
        moveHistory: [...state.metadata.moveHistory, result],
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
    this.chess.load(state.board);

    if (this.chess.isCheckmate()) {
      // The player whose turn it is has been checkmated
      const loser = state.players.find((p) => 
        p.role === (this.chess.turn() === 'w' ? 'white' : 'black')
      );
      const winner = state.players.find((p) => p.id !== loser?.id);
      return { finished: true, winner: winner?.id || null };
    }

    if (this.chess.isDraw() || this.chess.isStalemate() || this.chess.isThreefoldRepetition()) {
      return { finished: true, winner: 'draw' };
    }

    return { finished: false, winner: null };
  }

  getValidMoves(state: GameState): Move[] {
    this.chess.load(state.board);
    const moves = this.chess.moves({ verbose: true });

    return moves.map((m) => ({
      playerId: state.currentTurn,
      type: 'move',
      data: { from: m.from, to: m.to, promotion: m.promotion },
      timestamp: Date.now(),
    }));
  }

  /**
   * Chess-specific helper methods
   */
  isCheck(state: GameState): boolean {
    this.chess.load(state.board);
    return this.chess.isCheck();
  }

  getPGN(state: GameState): string {
    this.chess.load(state.board);
    return this.chess.pgn();
  }
}
