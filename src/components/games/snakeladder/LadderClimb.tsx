/**
 * Ladder Climb Animation
 * Joy moment - uplifting, earned reward
 */

import { motion } from 'framer-motion';
import { SNAKELADDER_CONFIG } from '@/lib/snakeladder/config';
import { snakeLadderSounds } from '@/lib/snakeladder/sounds';

interface LadderClimbProps {
  from: { x: number; y: number };
  to: { x: number; y: number };
  onComplete: () => void;
}

export const LadderClimb = ({ from, to, onComplete }: LadderClimbProps) => {
  const duration = SNAKELADDER_CONFIG.TIMING.LADDER_CLIMB_MS / 1000;

  return (
    <motion.div
      className="absolute w-10 h-10 rounded-full bg-blue-500 z-10"
      style={{ left: from.x, top: from.y }}
      initial={{ y: 0 }}
      animate={{ y: to.y - from.y }}
      transition={{ 
        duration, 
        ease: 'easeOut' // Smooth upward motion
      }}
      onAnimationStart={() => {
        snakeLadderSounds.playLadderClimb();
      }}
      onAnimationComplete={() => {
        // Breathing room after joy
        setTimeout(onComplete, SNAKELADDER_CONFIG.TIMING.BREATHING_ROOM_MS);
      }}
    >
      {/* Glow trail */}
      <motion.div
        className="absolute inset-0 rounded-full"
        initial={{ opacity: 0, scale: 1 }}
        animate={{ 
          opacity: [0, 0.6, 0],
          scale: [1, 1.5, 1],
        }}
        transition={{ duration: duration * 0.5, repeat: 2 }}
        style={{
          background: 'radial-gradient(circle, #22c55e60, transparent)',
        }}
      />
    </motion.div>
  );
};
