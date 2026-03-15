/**
 * Canonical Connect4 game state model.
 */

export type CellValue = 0 | 1 | 2;

export type BoardStatus = 'waiting' | 'active' | 'won' | 'draw';

export interface BoardState {
  rows: number;
  cols: number;
  grid: CellValue[][];
  currentPlayer: 1 | 2;
  status: BoardStatus;
  winner: 1 | 2 | null;
  winningCells: [number, number][] | null;
  moveCount: number;
  lastMove: { row: number; col: number } | null;
}

export type Connect4Move = {
  type: 'drop';
  playerId: string;
  column: number;
};

export type Connect4Config = {
  players: [string, string];
  startingPlayer?: '1' | '2';
};
