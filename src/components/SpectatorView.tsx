import React from 'react';
import { Connect4Board, CellValue } from './Connect4Board';

export type SpectatorViewProps = {
  board: CellValue[][];
  currentPlayer: 1 | 2;
  winner: 1 | 2 | null;
  winningCells?: [number, number][] | null;
  playerNames: Record<1 | 2, string>;
};

export const SpectatorView: React.FC<SpectatorViewProps> = ({
  board,
  currentPlayer,
  winner,
  winningCells,
  playerNames,
}) => {
  return (
    <div className='space-y-4'>
      <div className='text-sm text-white/70'>
        Spectating {playerNames[1]} vs {playerNames[2]}
      </div>
      <Connect4Board
        board={board}
        currentPlayer={currentPlayer}
        isMyTurn={false}
        winner={winner}
        winningCells={winningCells}
        onDrop={() => {}}
      />
      <div className='text-xs text-white/60'>
        Spectators cannot interact. Join the game to play.
      </div>
    </div>
  );
};
