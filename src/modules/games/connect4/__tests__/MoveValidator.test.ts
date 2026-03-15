import { describe, it, expect } from 'vitest';
import { BoardState } from '../types';
import { MoveValidator } from '../MoveValidator';

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

describe('MoveValidator', () => {
  it('rejects move when game is not active', () => {
    const state = createEmptyState();
    state.status = 'waiting';

    const result = MoveValidator.validate(state, { type: 'drop', playerId: 'p1', column: 0 }, 1);
    expect(result.valid).toBe(false);
  });

  it('rejects move when wrong player', () => {
    const state = createEmptyState();
    state.currentPlayer = 2;

    const result = MoveValidator.validate(state, { type: 'drop', playerId: 'p1', column: 0 }, 1);
    expect(result.valid).toBe(false);
  });

  it('rejects move when column is invalid', () => {
    const state = createEmptyState();
    const result = MoveValidator.validate(state, { type: 'drop', playerId: 'p1', column: -1 }, 1);
    expect(result.valid).toBe(false);

    const result2 = MoveValidator.validate(state, { type: 'drop', playerId: 'p1', column: 7 }, 1);
    expect(result2.valid).toBe(false);
  });

  it('rejects move when column is full', () => {
    const state = createEmptyState();
    for (let r = 0; r < state.rows; r++) {
      state.grid[r][0] = 1;
    }

    const result = MoveValidator.validate(state, { type: 'drop', playerId: 'p1', column: 0 }, 1);
    expect(result.valid).toBe(false);
  });

  it('accepts a legal move', () => {
    const state = createEmptyState();
    const result = MoveValidator.validate(state, { type: 'drop', playerId: 'p1', column: 0 }, 1);
    expect(result.valid).toBe(true);
  });
});
