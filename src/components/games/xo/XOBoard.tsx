/**
 * XO Board Component
 * Zero tolerance for confusion
 */

import { motion } from 'framer-motion';
import { AnimatedX, AnimatedO, StaticX, StaticO } from './SymbolAnimation';

type Cell = 'X' | 'O' | null;

interface XOBoardProps {
  cells: Cell[];
  onCellClick: (index: number) => void;
  isMyTurn: boolean;
  mySymbol: 'X' | 'O';
  justPlacedIndex?: number;
}

export const XOBoard = ({
  cells,
  onCellClick,
  isMyTurn,
  mySymbol: _mySymbol,
  justPlacedIndex,
}: XOBoardProps) => {
  return (
    <div className='relative'>
      {/* Active turn indicator - minimal glow */}
      {isMyTurn && (
        <motion.div
          className='absolute -inset-2 rounded-lg pointer-events-none'
          animate={{
            boxShadow: [
              '0 0 0px rgba(255,255,255,0)',
              '0 0 10px rgba(255,255,255,0.3)',
              '0 0 0px rgba(255,255,255,0)',
            ],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}

      {/* Grid - thick lines, high contrast */}
      <div className='grid grid-cols-3 gap-0 w-80 h-80 bg-slate-900'>
        {cells.map((cell, i) => {
          const isJustPlaced = i === justPlacedIndex;
          const isEmpty = cell === null;

          return (
            <button
              key={i}
              onClick={() => onCellClick(i)}
              disabled={!isMyTurn || !isEmpty}
              className={`
                border-4 border-slate-700 
                flex items-center justify-center
                transition-colors duration-100
                ${isEmpty && isMyTurn ? 'hover:bg-slate-800/30 cursor-pointer' : 'cursor-default'}
              `}
              style={{
                borderRight: i % 3 === 2 ? 'none' : undefined,
                borderBottom: i >= 6 ? 'none' : undefined,
              }}
            >
              {/* Render symbols */}
              {cell === 'X' && (isJustPlaced ? <AnimatedX /> : <StaticX />)}
              {cell === 'O' && (isJustPlaced ? <AnimatedO /> : <StaticO />)}
            </button>
          );
        })}
      </div>
    </div>
  );
};
