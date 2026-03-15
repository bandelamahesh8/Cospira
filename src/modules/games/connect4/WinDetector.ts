/**
 * Win detection logic for Connect4.
 *
 * Only evaluates from the last move to improve performance.
 */

import { BoardState, CellValue } from './types';

export type WinResult = {
  winner: 1 | 2;
  winningCells: [number, number][];
};

const DIRECTIONS: Array<{ dr: number; dc: number }> = [
  { dr: 0, dc: 1 },
  { dr: 1, dc: 0 },
  { dr: 1, dc: 1 },
  { dr: 1, dc: -1 },
];

function inBounds(state: BoardState, row: number, col: number) {
  return row >= 0 && row < state.rows && col >= 0 && col < state.cols;
}

export class WinDetector {
  static detectWin(state: BoardState): WinResult | null {
    const lastMove = state.lastMove;
    if (!lastMove) return null;

    const player = state.grid[lastMove.row][lastMove.col] as CellValue;
    if (player === 0) return null;

    for (const { dr, dc } of DIRECTIONS) {
      const cells: [number, number][] = [[lastMove.row, lastMove.col]];

      // look in positive direction
      let r = lastMove.row + dr;
      let c = lastMove.col + dc;
      while (inBounds(state, r, c) && state.grid[r][c] === player) {
        cells.push([r, c]);
        r += dr;
        c += dc;
      }

      // look in negative direction
      r = lastMove.row - dr;
      c = lastMove.col - dc;
      while (inBounds(state, r, c) && state.grid[r][c] === player) {
        cells.unshift([r, c]);
        r -= dr;
        c -= dc;
      }

      if (cells.length >= 4) {
        return { winner: player as 1 | 2, winningCells: cells };
      }
    }

    return null;
  }
}
