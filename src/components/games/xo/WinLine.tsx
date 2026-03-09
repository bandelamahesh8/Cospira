/**
 * Win Line Component
 * Sharp, undeniable - 150ms strike-through
 */

import { motion } from 'framer-motion';
import { XO_CONFIG } from '@/lib/xo/config';

type WinLine = [number, number, number];

interface WinLineProps {
  line: WinLine;
  boardSize?: number;
}

export const WinLineComponent = ({ line, boardSize = 320 }: WinLineProps) => {
  const cellSize = boardSize / 3;
  const lineStyle = getLineStyle(line, cellSize);

  return (
    <motion.div
      className='absolute bg-white pointer-events-none'
      style={{
        ...lineStyle,
        height: '4px',
      }}
      initial={{ scaleX: 0 }}
      animate={{ scaleX: 1 }}
      transition={{
        duration: XO_CONFIG.TIMING.WIN_LINE_MS / 1000,
        ease: 'linear',
      }}
    />
  );
};

/**
 * Calculate line position and rotation
 */
function getLineStyle(line: WinLine, cellSize: number) {
  const [a, b, c] = line;

  // Horizontal lines
  if (a === 0 && b === 1 && c === 2) {
    return { top: cellSize * 0.5, left: 0, width: cellSize * 3 };
  }
  if (a === 3 && b === 4 && c === 5) {
    return { top: cellSize * 1.5, left: 0, width: cellSize * 3 };
  }
  if (a === 6 && b === 7 && c === 8) {
    return { top: cellSize * 2.5, left: 0, width: cellSize * 3 };
  }

  // Vertical lines
  if (a === 0 && b === 3 && c === 6) {
    return {
      top: 0,
      left: cellSize * 0.5,
      width: cellSize * 3,
      transform: 'rotate(90deg)',
      transformOrigin: 'top left',
    };
  }
  if (a === 1 && b === 4 && c === 7) {
    return {
      top: 0,
      left: cellSize * 1.5,
      width: cellSize * 3,
      transform: 'rotate(90deg)',
      transformOrigin: 'top left',
    };
  }
  if (a === 2 && b === 5 && c === 8) {
    return {
      top: 0,
      left: cellSize * 2.5,
      width: cellSize * 3,
      transform: 'rotate(90deg)',
      transformOrigin: 'top left',
    };
  }

  // Diagonal lines
  if (a === 0 && b === 4 && c === 8) {
    return {
      top: cellSize * 1.5,
      left: cellSize * 1.5,
      width: cellSize * Math.sqrt(2) * 3,
      transform: 'rotate(45deg)',
      transformOrigin: 'center',
    };
  }
  if (a === 2 && b === 4 && c === 6) {
    return {
      top: cellSize * 1.5,
      left: cellSize * 1.5,
      width: cellSize * Math.sqrt(2) * 3,
      transform: 'rotate(-45deg)',
      transformOrigin: 'center',
    };
  }

  return {};
}
