/**
 * Ludo Token Component
 * Features: Token personality (wiggle before kill, bounce on six)
 */

import { motion } from 'framer-motion';
import { LUDO_CONFIG } from '@/lib/ludo/config';

interface TokenProps {
  id: string;
  color: string;
  position: number;
  isSelected?: boolean;
  canKill?: boolean;
  onSix?: boolean;
  onClick?: () => void;
}

export const LudoToken = ({
  id: _id,
  color,
  position: _position,
  isSelected,
  canKill,
  onSix,
  onClick,
}: TokenProps) => {
  const shouldWiggle = LUDO_CONFIG.EMOTION.TOKEN_WIGGLE_BEFORE_KILL && canKill;
  const shouldBounce = LUDO_CONFIG.EMOTION.TOKEN_BOUNCE_ON_SIX && onSix;

  return (
    <motion.div
      onClick={onClick}
      className='absolute w-8 h-8 rounded-full cursor-pointer'
      style={{
        backgroundColor: color,
        border: isSelected ? '3px solid white' : '2px solid rgba(0,0,0,0.2)',
        boxShadow: isSelected ? `0 0 15px ${color}` : '0 2px 4px rgba(0,0,0,0.2)',
      }}
      // Token personality: Wiggle before kill
      animate={
        shouldWiggle
          ? {
              rotate: [0, -5, 5, -5, 5, 0],
            }
          : shouldBounce
            ? {
                y: [0, -8, 0], // Bounce on six
              }
            : {}
      }
      transition={{
        rotate: { duration: 0.5, ease: 'easeInOut' },
        y: { duration: 0.4, ease: 'easeOut' },
      }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Token inner design */}
      <div className='w-full h-full rounded-full flex items-center justify-center'>
        <div className='w-4 h-4 rounded-full bg-white opacity-30' />
      </div>
    </motion.div>
  );
};
