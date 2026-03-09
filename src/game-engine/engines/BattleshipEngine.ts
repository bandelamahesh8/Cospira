import { BaseGameEngine } from '../core/BaseGameEngine';
import {
  GameState,
  Move,
  Player,
  ValidationResult,
  WinnerResult,
} from '../core/GameEngine.interface';

type CellState = 'empty' | 'hit' | 'miss' | 'ship';
type ShipType = 'carrier' | 'battleship' | 'cruiser' | 'submarine' | 'destroyer';

interface Ship {
  id: string;
  type: ShipType;
  size: number;
  hits: number;
  coords: { r: number; c: number }[];
}

interface PlayerBoard {
  grid: CellState[][]; // 10x10 grid
  ships: Ship[];
  isReady: boolean;
  shotsFired: { r: number; c: number; hit: boolean }[]; // Track shots made by this player (or against? usually against self logic is easier to store in self board, but shots are made AGAINST opponent)
  // Let's store shots received on the board grid itself (hit/miss).
  // But we need to know where I SHOT to show on my 'radar'.
  // Actually, distinct grids are better.
  // Self Grid: My Ships + Enemy Shots (Hits/Misses on me)
  // Radar Grid: My Shots (Hits/Misses on enemy) -> This is derived from Enemy Board
}

/*
    State Structure:
    board: {
        [playerId]: {
             grid: CellState[][] (stores 'empty', 'ship' initially. Updates to 'hit', 'miss' on shots)
             ships: Ship[]
             isReady: boolean
        }
    }
*/

export class BattleshipEngine extends BaseGameEngine {
  private readonly BOARD_SIZE = 10;
  private readonly SHIPS: Record<ShipType, number> = {
    carrier: 5,
    battleship: 4,
    cruiser: 3,
    submarine: 3,
    destroyer: 2,
  };

  initGame(players: Player[]): GameState {
    if (players.length !== 2) throw new Error('Battleship requires exactly 2 players');

    const board: Record<string, PlayerBoard> = {};
    players.forEach((p) => {
      board[p.id] = {
        grid: Array(this.BOARD_SIZE)
          .fill(null)
          .map(() => Array(this.BOARD_SIZE).fill('empty')),
        ships: [],
        isReady: false,
        shotsFired: [],
      };
    });

    const gameState: GameState = {
      id: this.generateGameId(),
      type: 'battleship',
      players,
      currentTurn: players[0].id,
      status: 'active', // But phase is SETUP
      winner: null,
      board,
      metadata: {
        phase: 'SETUP', // SETUP | BATTLE
        moveHistory: [],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.state = gameState;
    return gameState;
  }

  validateMove(move: Move, state: GameState): ValidationResult {
    const { phase } = state.metadata;
    const playerBoard = state.board[move.playerId] as PlayerBoard;

    if (phase === 'SETUP') {
      if (move.type === 'place_ships') {
        if (playerBoard.isReady) return { valid: false, reason: 'Already ready' };
        // Validate placement (complex, depends on data shape)
        // Expect move.data.ships to be full list of placed ships?
        // Or single ship? Usually easier to send full configuration when "Ready" is clicked.
        return { valid: true };
      }
      return { valid: false, reason: 'Invalid move for SETUP phase' };
    }

    if (phase === 'BATTLE') {
      if (move.playerId !== state.currentTurn) return { valid: false, reason: 'Not your turn' };
      if (move.type !== 'shoot') return { valid: false, reason: 'Invalid move type' };

      const { r, c } = move.data;
      if (r < 0 || r >= this.BOARD_SIZE || c < 0 || c >= this.BOARD_SIZE)
        return { valid: false, reason: 'Out of bounds' };

      // Check if already shot at this location
      // Target is opponent
      const opponent = state.players.find((p) => p.id !== move.playerId);
      if (!opponent) return { valid: false };

      const targetBoard = state.board[opponent.id] as PlayerBoard;
      const cell = targetBoard.grid[r][c];
      if (cell === 'hit' || cell === 'miss') return { valid: false, reason: 'Already shot here' };

      return { valid: true };
    }

    return { valid: false };
  }

  applyMove(move: Move, state: GameState): GameState {
    const newState = { ...state, board: JSON.parse(JSON.stringify(state.board)) }; // Deep copy
    const { phase } = state.metadata;

    if (phase === 'SETUP') {
      if (move.type === 'place_ships') {
        const board = newState.board[move.playerId];
        board.ships = move.data.ships; // Assume valid for now or validation was heavy

        // Reconstruct grid based on ships
        board.grid = Array(this.BOARD_SIZE)
          .fill(null)
          .map(() => Array(this.BOARD_SIZE).fill('empty'));
        board.ships.forEach((ship: Ship) => {
          ship.coords.forEach(({ r, c }) => {
            board.grid[r][c] = 'ship';
          });
        });

        board.isReady = true;

        // Check if both ready
        const allReady = newState.players.every((p: Player) => newState.board[p.id].isReady);
        if (allReady) {
          newState.metadata.phase = 'BATTLE';
        }
      }
    } else if (phase === 'BATTLE') {
      const opponent = state.players.find((p) => p.id !== move.playerId);
      if (!opponent) throw new Error('No opponent found');

      const targetBoard = newState.board[opponent.id] as PlayerBoard;
      const { r, c } = move.data;

      // Process Shot
      if (targetBoard.grid[r][c] === 'ship') {
        targetBoard.grid[r][c] = 'hit';
        // Update ship hits
        const ship = targetBoard.ships.find((s: Ship) =>
          s.coords.some((coord) => coord.r === r && coord.c === c)
        );
        if (ship) ship.hits++;

        newState.metadata.lastResult = 'HIT';
      } else {
        targetBoard.grid[r][c] = 'miss';
        newState.metadata.lastResult = 'MISS';
      }

      // Switch turn
      newState.currentTurn = this.getNextPlayer(state);
      newState.metadata.moveHistory.push(move);
    }

    const winnerCheck = this.checkWinner(newState);
    if (winnerCheck.finished) {
      newState.status = 'finished';
      newState.winner = winnerCheck.winner;
    }

    this.state = newState;
    return newState;
  }

  checkWinner(state: GameState): WinnerResult {
    if (state.metadata.phase === 'SETUP') return { finished: false, winner: null };

    for (const player of state.players) {
      const opponent = state.players.find((p) => p.id !== player.id);
      if (!opponent) continue; // Should not happen

      // Check if Opponent has lost (all ships sunk)
      const opBoard = state.board[opponent.id] as PlayerBoard;
      const allSunk = opBoard.ships.every((s: Ship) => s.hits >= s.size);

      if (allSunk) {
        return { finished: true, winner: player.id };
      }
    }

    return { finished: false, winner: null };
  }

  getValidMoves(state: GameState): Move[] {
    return []; // Not implemented for simple AI yet
  }
}
