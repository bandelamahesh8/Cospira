/**
 * BoardStateManager controls the immutable board state transitions for Connect4.
 *
 * It maintains the canonical BoardState model as defined in the Connect4 spec.
 */

import { BoardState, CellValue } from './types';

const DEFAULT_ROWS = 6;
const DEFAULT_COLS = 7;

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

export class BoardStateManager {
  private state: BoardState;

  constructor(initialState?: Partial<BoardState>) {
    this.state = {
      rows: DEFAULT_ROWS,
      cols: DEFAULT_COLS,
      grid: Array.from({ length: DEFAULT_ROWS }, () => Array.from({ length: DEFAULT_COLS }, () => 0 as CellValue)),
      currentPlayer: 1,
      status: 'waiting',
      winner: null,
      winningCells: null,
      moveCount: 0,
      lastMove: null,
      ...initialState,
    };
  }

  getState(): BoardState {
    return deepClone(this.state);
  }

  reset(): BoardState {
    this.state = {
      rows: DEFAULT_ROWS,
      cols: DEFAULT_COLS,
      grid: Array.from({ length: DEFAULT_ROWS }, () => Array.from({ length: DEFAULT_COLS }, () => 0 as CellValue)),
      currentPlayer: 1,
      status: 'waiting',
      winner: null,
      winningCells: null,
      moveCount: 0,
      lastMove: null,
    };

    return this.getState();
  }

  setActive(): BoardState {
    this.state = {
      ...this.state,
      status: 'active',
    };
    return this.getState();
  }

  applyMove(row: number, col: number, player: 1 | 2): BoardState {
    const newGrid = deepClone(this.state.grid);
    newGrid[row][col] = player;

    const nextPlayer = player === 1 ? 2 : 1;

    this.state = {
      ...this.state,
      grid: newGrid,
      currentPlayer: nextPlayer,
      moveCount: this.state.moveCount + 1,
      lastMove: { row, col },
    };

    return this.getState();
  }

  updateStatus(status: BoardState['status'], winner: 1 | 2 | null = null, winningCells: [number, number][] | null = null): BoardState {
    this.state = {
      ...this.state,
      status,
      winner,
      winningCells,
    };
    return this.getState();
  }
}
