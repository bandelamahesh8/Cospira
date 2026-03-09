/**
 * Six Celebration Component
 * Features: Quick confetti burst + glow (max 300ms)
 */

import { motion } from 'framer-motion';

interface SixCelebrationProps {
  playerColor: string;
  onComplete?: () => void;
}

export const SixCelebration = ({ playerColor, onComplete }: SixCelebrationProps) => {
  return (
    <div className='absolute inset-0 pointer-events-none'>
      {/* Dice glow */}
      <motion.div
        initial={{ opacity: 0, scale: 1 }}
        animate={{ opacity: [0, 1, 0], scale: [1, 1.3, 1] }}
        transition={{ duration: 0.3 }}
        className='absolute inset-0 rounded-lg'
        style={{
          boxShadow: `0 0 40px ${playerColor}`,
        }}
        onAnimationComplete={onComplete}
      />

      {/* Quick confetti micro-burst */}
      <div className='absolute inset-0 flex items-center justify-center'>
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            initial={{
              x: 0,
              y: 0,
              opacity: 1,
              scale: 1,
            }}
            animate={{
              x: Math.cos((i * 60 * Math.PI) / 180) * 40,
              y: Math.sin((i * 60 * Math.PI) / 180) * 40,
              opacity: 0,
              scale: 0,
            }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className='absolute w-2 h-2 rounded-full'
            style={{ backgroundColor: playerColor }}
          />
        ))}
      </div>

      {/* Brief board pulse */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.2, 0] }}
        transition={{ duration: 0.3 }}
        className='absolute inset-0'
        style={{ backgroundColor: playerColor }}
      />
    </div>
  );
};
