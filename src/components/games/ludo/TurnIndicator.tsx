/**
 * Turn Indicator Component
 * Features: Screen-edge color glow for active player
 */

import { motion } from 'framer-motion';

interface TurnIndicatorProps {
  activePlayerColor: string;
  isActive: boolean;
}

export const TurnIndicator = ({ activePlayerColor, isActive }: TurnIndicatorProps) => {
  if (!isActive) return null;

  return (
    <motion.div
      className='fixed inset-0 pointer-events-none z-10'
      animate={{
        boxShadow: [
          `inset 0 0 0px ${activePlayerColor}`,
          `inset 0 0 60px ${activePlayerColor}`,
          `inset 0 0 0px ${activePlayerColor}`,
        ],
      }}
      transition={{
        repeat: Infinity,
        duration: 2,
        ease: 'easeInOut',
      }}
      style={{
        borderRadius: '1rem',
      }}
    />
  );
};
