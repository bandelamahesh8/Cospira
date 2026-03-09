/**
 * Turn Indicator Component
 * Gentle, obvious - soft halo, no flashing
 */

import { motion } from 'framer-motion';
import { SNAKELADDER_CONFIG } from '@/lib/snakeladder/config';

interface TurnIndicatorProps {
  activePlayer: {
    id: string;
    name: string;
  };
  position: { x: number; y: number };
}

export const TurnIndicator = ({ activePlayer: _activePlayer, position }: TurnIndicatorProps) => {
  return (
    <motion.div
      className='absolute pointer-events-none'
      style={{ left: position.x, top: position.y }}
      animate={{
        boxShadow: [
          '0 0 0px rgba(59, 130, 246, 0)',
          `0 0 30px rgba(59, 130, 246, ${SNAKELADDER_CONFIG.VISUAL.TURN_HALO_OPACITY})`,
          '0 0 0px rgba(59, 130, 246, 0)',
        ],
      }}
      transition={{
        repeat: Infinity,
        duration: 3, // Slow, gentle
        ease: 'easeInOut',
      }}
    >
      {/* Soft halo circle */}
      <div className='w-12 h-12 rounded-full border-2 border-blue-400' />
    </motion.div>
  );
};
