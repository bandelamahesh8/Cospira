import { describe, it, expect } from 'vitest';
import { BoardState } from '../types';
import { WinDetector } from '../WinDetector';

const createEmptyState = (): BoardState => ({
  rows: 6,
  cols: 7,
  grid: Array.from({ length: 6 }, () => Array.from({ length: 7 }, () => 0)),
  currentPlayer: 1,
  status: 'active',
  winner: null,
  winningCells: null,
  moveCount: 0,
  lastMove: null,
});

describe('WinDetector', () => {
  it('detects horizontal win', () => {
    const state = createEmptyState();
    state.grid[5][0] = 1;
    state.grid[5][1] = 1;
    state.grid[5][2] = 1;
    state.grid[5][3] = 1;
    state.lastMove = { row: 5, col: 3 };

    const result = WinDetector.detectWin(state);
    expect(result).not.toBeNull();
    expect(result?.winner).toBe(1);
    expect(result?.winningCells.length).toBeGreaterThanOrEqual(4);
  });

  it('detects vertical win', () => {
    const state = createEmptyState();
    state.grid[2][4] = 2;
    state.grid[3][4] = 2;
    state.grid[4][4] = 2;
    state.grid[5][4] = 2;
    state.lastMove = { row: 5, col: 4 };

    const result = WinDetector.detectWin(state);
    expect(result).not.toBeNull();
    expect(result?.winner).toBe(2);
    expect(result?.winningCells.length).toBeGreaterThanOrEqual(4);
  });

  it('detects diagonal down-right win', () => {
    const state = createEmptyState();
    state.grid[2][1] = 1;
    state.grid[3][2] = 1;
    state.grid[4][3] = 1;
    state.grid[5][4] = 1;
    state.lastMove = { row: 5, col: 4 };

    const result = WinDetector.detectWin(state);
    expect(result).not.toBeNull();
    expect(result?.winner).toBe(1);
  });

  it('detects diagonal down-left win', () => {
    const state = createEmptyState();
    state.grid[2][5] = 2;
    state.grid[3][4] = 2;
    state.grid[4][3] = 2;
    state.grid[5][2] = 2;
    state.lastMove = { row: 5, col: 2 };

    const result = WinDetector.detectWin(state);
    expect(result).not.toBeNull();
    expect(result?.winner).toBe(2);
  });

  it('returns null when no win exists', () => {
    const state = createEmptyState();
    state.grid[5][0] = 1;
    state.grid[5][1] = 1;
    state.grid[5][2] = 1;
    state.lastMove = { row: 5, col: 2 };

    const result = WinDetector.detectWin(state);
    expect(result).toBeNull();
  });
});
