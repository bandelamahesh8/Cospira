import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type CellValue = 0 | 1 | 2;

export type Connect4BoardProps = {
  board: CellValue[][];
  currentPlayer: 1 | 2;
  isMyTurn: boolean;
  winner: 1 | 2 | null;
  onDrop: (column: number) => void;
  winningCells?: [number, number][] | null;
};

export const Connect4Board: React.FC<Connect4BoardProps> = ({
  board,
  currentPlayer,
  isMyTurn,
  winner,
  onDrop,
  winningCells = null,
}) => {
  const isActive = !winner;

  const isWinningCell = (row: number, col: number) =>
    !!winningCells?.some(([r, c]) => r === row && c === col);

  return (
    <div className='flex flex-col items-center justify-center w-full max-w-lg mx-auto'>
      {/* Numbered Buttons Layer (Phase 9 Integration) */}
      <div className='grid grid-cols-7 gap-2 md:gap-3 w-full mb-4 px-3 md:px-4'>
        {[1, 2, 3, 4, 5, 6, 7].map((num, i) => (
          <button
            key={`btn-${i}`}
            disabled={!isActive || !isMyTurn || board[0][i] !== 0}
            onClick={() => onDrop(i)}
            className={`
              h-8 md:h-10 rounded-lg flex items-center justify-center font-bold text-xs md:text-sm transition-all
              ${
                !isActive || !isMyTurn || board[0][i] !== 0
                  ? 'bg-slate-800 text-slate-600 cursor-not-allowed opacity-50'
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:scale-105 active:scale-95 shadow-lg'
              }
            `}
          >
            {num}
          </button>
        ))}
      </div>

      {/* The Board - Classic Blue Aesthetic */}
      <div
        className='grid grid-cols-7 gap-2 md:gap-3 bg-blue-600 p-3 md:p-4 rounded-xl shadow-2xl relative z-20 border-4 border-blue-800'
        role='grid'
        aria-label='Connect 4 Board'
      >
        {board[0].map((_, colIndex) => (
          <div key={`col-${colIndex}`} className='flex flex-col gap-2 md:gap-3 relative group'>
            {/* Column hover indicator */}
            {isActive && isMyTurn && board[0][colIndex] === 0 && (
              <div
                className='absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer'
                onClick={() => onDrop(colIndex)}
              >
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  className='text-white text-lg'
                >
                  ▼
                </motion.div>
              </div>
            )}

            {board.map((row, rowIndex) => {
              const cell = row[colIndex];
              const isWinning = isWinningCell(rowIndex, colIndex);

              return (
                <div
                  key={`${colIndex}-${rowIndex}`}
                  onClick={() => isActive && isMyTurn && onDrop(colIndex)}
                  className={`
                    w-10 h-10 md:w-12 md:h-12 rounded-full shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)] overflow-hidden relative cursor-pointer
                    ${isWinning ? 'ring-4 ring-white animate-pulse z-30' : 'bg-slate-900'}
                  `}
                  role='gridcell'
                  aria-label={`Row ${rowIndex + 1}, Column ${colIndex + 1}: ${
                    cell === 0 ? 'empty' : cell === 1 ? 'red' : 'yellow'
                  }`}
                >
                  <AnimatePresence>
                    {cell !== 0 && (
                      <motion.div
                        initial={{ y: -400, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                        className='w-full h-full p-1'
                      >
                        <div
                          className={`w-full h-full rounded-full shadow-lg border-2 border-white/20 relative overflow-hidden ${
                            cell === 1 ? 'bg-red-500' : 'bg-yellow-400'
                          }`}
                        >
                          {/* Gloss effect */}
                          <div className='absolute top-[10%] left-[10%] w-[40%] h-[40%] bg-white/30 rounded-full blur-[2px]' />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Status Bar - Classic style */}
      <div className='mt-6 w-full px-4 py-3 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 flex items-center justify-between shadow-xl'>
        <div className='flex items-center gap-3'>
          <div
            className={`w-4 h-4 rounded-full ${currentPlayer === 1 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.5)]'}`}
          />
          <span className='text-xs font-black uppercase tracking-widest text-white'>
            {winner ? 'GAME OVER' : isMyTurn ? 'Your Turn' : "Opponent's Turn"}
          </span>
        </div>

        {winner && (
          <span className='text-xs font-black bg-white/10 px-3 py-1 rounded-full text-white animate-bounce'>
            {winner === currentPlayer ? 'VICTORY' : 'DEFEAT'}
          </span>
        )}
      </div>
    </div>
  );
};
