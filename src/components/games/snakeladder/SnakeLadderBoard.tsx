import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * PRODUCTION-GRADE SNAKE & LADDER BOARD
 * Features:
 * - Boustrophedon 10x10 Grid
 * - Dynamic SVG Snakes & Ladders
 * - Animated Player Tokens
 * - High-Fidelity Glassmorphism UI
 */

interface Player {
  id: string;
  name: string;
  pos: number;
  color: string;
}

interface SnakeLadderBoardProps {
  players: Player[];
  currentTurn: string;
  snakes: Record<number, number>;
  ladders: Record<number, number>;
  onCellClick?: (cell: number) => void;
}

// Boustrophedon Mapping: Converts cell index (1-100) to grid coordinates (row, col)
const getCellCoords = (cell: number) => {
  const zeroIndexed = cell - 1;
  const row = Math.floor(zeroIndexed / 10);
  const colInRow = zeroIndexed % 10;

  // Even rows (0, 2, 4...) go L -> R
  // Odd rows (1, 3, 5...) go R -> L
  const col = row % 2 === 0 ? colInRow : 9 - colInRow;

  return { row: 9 - row, col }; // Row 0 is at the bottom
};

export const SnakeLadderBoard: React.FC<SnakeLadderBoardProps> = ({
  players,
  currentTurn,
  snakes,
  ladders,
}) => {
  // Generate grid cells
  const cells = useMemo(() => {
    return Array.from({ length: 100 }, (_, i) => 100 - i);
  }, []);

  // SVG Snake paths generator
  const renderSnakes = () => {
    return Object.entries(snakes).map(([head, tail]) => {
      const start = getCellCoords(Number(head));
      const end = getCellCoords(Number(tail));

      const x1 = start.col * 10 + 5;
      const y1 = start.row * 10 + 5;
      const x2 = end.col * 10 + 5;
      const y2 = end.row * 10 + 5;

      // Cubic Bezier for curves
      const midX = (x1 + x2) / 2 + (Math.random() > 0.5 ? 10 : -10);
      const midY = (y1 + y2) / 2;

      return (
        <motion.path
          key={`snake-${head}-${tail}`}
          d={`M ${x1} ${y1} Q ${midX} ${midY} ${x2} ${y2}`}
          stroke='url(#snakeGradient)'
          strokeWidth='1.5'
          fill='none'
          strokeLinecap='round'
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.8 }}
          transition={{ duration: 1.5, ease: 'easeInOut' }}
        />
      );
    });
  };

  // SVG Ladder paths generator
  const renderLadders = () => {
    return Object.entries(ladders).map(([base, top]) => {
      const start = getCellCoords(Number(base));
      const end = getCellCoords(Number(top));

      const x1 = start.col * 10 + 5;
      const y1 = start.row * 10 + 5;
      const x2 = end.col * 10 + 5;
      const y2 = end.row * 10 + 5;

      return (
        <React.Fragment key={`ladder-${base}-${top}`}>
          {/* Main rails */}
          <motion.line
            x1={x1 - 1.5}
            y1={y1}
            x2={x2 - 1.5}
            y2={y2}
            stroke='#3B82F6'
            strokeWidth='1'
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
          />
          <motion.line
            x1={x1 + 1.5}
            y1={y1}
            x2={x2 + 1.5}
            y2={y2}
            stroke='#3B82F6'
            strokeWidth='1'
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
          />
          {/* Rungs */}
          {Array.from({ length: 5 }).map((_, i) => {
            const ratio = (i + 1) / 6;
            const rx = x1 + (x2 - x1) * ratio;
            const ry = y1 + (y2 - y1) * ratio;
            return (
              <line
                key={i}
                x1={rx - 2}
                y1={ry}
                x2={rx + 2}
                y2={ry}
                stroke='#fff'
                strokeWidth='0.5'
              />
            );
          })}
        </React.Fragment>
      );
    });
  };

  return (
    <div className='relative w-full aspect-square max-w-[600px] mx-auto bg-[#0a0f1d] rounded-2xl border-4 border-slate-800 shadow-2xl p-2 overflow-hidden'>
      {/* BACKGROUND GRID */}
      <div className='absolute inset-0 grid grid-cols-10 grid-rows-10 p-2 opacity-20'>
        {Array.from({ length: 100 }).map((_, i) => (
          <div key={i} className='border-[0.5px] border-white/5' />
        ))}
      </div>

      {/* BOARD CELLS */}
      <div className='relative z-10 w-full h-full grid grid-cols-10 grid-rows-10'>
        {cells.map((cellNum) => {
          const coords = getCellCoords(cellNum);
          const isRed = (coords.row + coords.col) % 2 === 1;

          return (
            <div
              key={cellNum}
              className={cn(
                'relative flex items-center justify-center text-[8px] font-bold transition-colors',
                isRed ? 'bg-red-600/20 text-red-500/50' : 'bg-white/5 text-slate-500'
              )}
              style={{
                gridRow: coords.row + 1,
                gridColumn: coords.col + 1,
              }}
            >
              <span className='absolute top-1 left-1 opacity-40'>{cellNum}</span>
              {cellNum === 100 && (
                <motion.div
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className='w-full h-full bg-yellow-500/10 flex items-center justify-center'
                >
                  🏆
                </motion.div>
              )}
            </div>
          );
        })}
      </div>

      {/* SVG OVERLAY FOR SNAKES & LADDERS */}
      <svg
        viewBox='0 0 100 100'
        className='absolute inset-0 w-full h-full pointer-events-none z-20'
      >
        <defs>
          <linearGradient id='snakeGradient' x1='0%' y1='0%' x2='100%' y2='100%'>
            <stop offset='0%' stopColor='#F59E0B' />
            <stop offset='100%' stopColor='#EF4444' />
          </linearGradient>
        </defs>
        {renderLadders()}
        {renderSnakes()}
      </svg>

      {/* PLAYER TOKENS */}
      <div className='absolute inset-0 w-full h-full pointer-events-none z-30'>
        <AnimatePresence>
          {players.map((player) => {
            if (player.pos === 0) return null;
            const { row, col } = getCellCoords(player.pos);
            const isTurn = player.id === currentTurn;

            return (
              <motion.div
                key={player.id}
                layoutId={`player-${player.id}`}
                initial={false}
                animate={{
                  left: `${col * 10}%`,
                  top: `${row * 10}%`,
                  scale: isTurn ? 1.1 : 1,
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className='absolute w-[10%] h-[10%] flex items-center justify-center p-1'
              >
                <div className='relative w-full h-full'>
                  <div
                    className={cn(
                      'w-full h-full rounded-full border-2 shadow-lg flex items-center justify-center overflow-hidden',
                      isTurn
                        ? ' ring-2 ring-white ring-offset-2 ring-offset-transparent animate-pulse'
                        : ''
                    )}
                    style={{
                      backgroundColor: player.color,
                      borderColor: 'rgba(255,255,255,0.4)',
                      color: '#fff',
                    }}
                  >
                    <span className='text-[10px] font-black drop-shadow-md'>
                      {player.name.substring(0, 1).toUpperCase()}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};
export default SnakeLadderBoard;
