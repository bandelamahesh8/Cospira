/**
 * Board Elements - Snakes and Ladders
 * Absolute priority: Readability
 */

import { motion } from 'framer-motion';
import { SNAKELADDER_CONFIG } from '@/lib/snakeladder/config';

interface Position {
  x: number;
  y: number;
}

interface SnakeProps {
  head: Position;
  tail: Position;
  color?: string;
  isNearby?: boolean;
}

interface LadderProps {
  start: Position;
  end: Position;
  isNearby?: boolean;
}

/**
 * Snake Component
 * Head larger than body, eyes blink occasionally
 */
export const Snake = ({ head, tail, color = '#ef4444', isNearby }: SnakeProps) => {
  const pathData = `M ${tail.x} ${tail.y} Q ${(head.x + tail.x) / 2} ${(head.y + tail.y) / 2 - 20} ${head.x} ${head.y}`;

  return (
    <g className='snake'>
      {/* Body */}
      <motion.path
        d={pathData}
        stroke={color}
        strokeWidth='6'
        fill='none'
        strokeLinecap='round'
        animate={
          isNearby
            ? {
                stroke: [color, '#ff0000', color],
              }
            : {}
        }
        transition={{ duration: 1, repeat: isNearby ? Infinity : 0 }}
      />

      {/* Head (larger - 1.3x scale) */}
      <motion.circle
        cx={head.x}
        cy={head.y}
        r={SNAKELADDER_CONFIG.VISUAL.SNAKE_HEAD_SCALE * 10}
        fill={color}
        className='snake-head'
        animate={
          isNearby
            ? {
                fill: [color, '#ff0000', color],
              }
            : {}
        }
        transition={{ duration: 1, repeat: isNearby ? Infinity : 0 }}
      />

      {/* Eyes (blink occasionally) */}
      <motion.circle
        cx={head.x - 4}
        cy={head.y - 3}
        r='2'
        fill='white'
        animate={{ scaleY: [1, 0.1, 1] }}
        transition={{
          repeat: Infinity,
          duration: 0.2,
          repeatDelay: SNAKELADDER_CONFIG.EMOTION.AMBIENT_MOTION_INTERVAL_MS / 1000,
        }}
      />
      <motion.circle
        cx={head.x + 4}
        cy={head.y - 3}
        r='2'
        fill='white'
        animate={{ scaleY: [1, 0.1, 1] }}
        transition={{
          repeat: Infinity,
          duration: 0.2,
          repeatDelay: SNAKELADDER_CONFIG.EMOTION.AMBIENT_MOTION_INTERVAL_MS / 1000,
        }}
      />
    </g>
  );
};

/**
 * Ladder Component
 * Top glows faintly to indicate reward
 */
export const Ladder = ({ start, end, isNearby }: LadderProps) => {
  const color = '#22c55e';

  return (
    <g className='ladder'>
      {/* Side rails */}
      <line
        x1={start.x - 8}
        y1={start.y}
        x2={end.x - 8}
        y2={end.y}
        stroke={color}
        strokeWidth='4'
        strokeLinecap='round'
      />
      <line
        x1={start.x + 8}
        y1={start.y}
        x2={end.x + 8}
        y2={end.y}
        stroke={color}
        strokeWidth='4'
        strokeLinecap='round'
      />

      {/* Rungs */}
      {Array.from({ length: 5 }).map((_, i) => {
        const progress = i / 4;
        const x = start.x + (end.x - start.x) * progress;
        const y = start.y + (end.y - start.y) * progress;

        return <line key={i} x1={x - 8} y1={y} x2={x + 8} y2={y} stroke={color} strokeWidth='3' />;
      })}

      {/* Top glow (reward indicator) */}
      {SNAKELADDER_CONFIG.VISUAL.LADDER_TOP_GLOW && (
        <motion.circle
          cx={end.x}
          cy={end.y}
          r='12'
          fill={`${color}30`}
          animate={{
            opacity: isNearby ? [0.5, 0.9, 0.5] : [0.3, 0.5, 0.3],
            scale: isNearby ? [1, 1.2, 1] : [1, 1.1, 1],
          }}
          transition={{
            repeat: Infinity,
            duration: 2,
            repeatDelay: isNearby ? 0 : 8,
          }}
        />
      )}
    </g>
  );
};
