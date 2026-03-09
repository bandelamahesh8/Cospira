/**
 * Snake Bite Animation
 * Pain handled carefully - loss without humiliation
 */

import { motion } from 'framer-motion';
import { SNAKELADDER_CONFIG } from '@/lib/snakeladder/config';
import { snakeLadderSounds } from '@/lib/snakeladder/sounds';

interface SnakeBiteProps {
  from: { x: number; y: number };
  to: { x: number; y: number };
  onComplete: () => void;
}

export const SnakeBite = ({ from, to, onComplete }: SnakeBiteProps) => {
  const duration = SNAKELADDER_CONFIG.TIMING.SNAKE_SLIDE_MS / 1000;
  const pauseDuration = 0.3; // Emotional pause before fall

  return (
    <>
      {/* Warning glow (snake head glows red) */}
      <motion.div
        className='absolute w-16 h-16 rounded-full pointer-events-none'
        style={{
          left: from.x - 8,
          top: from.y - 8,
          background: 'radial-gradient(circle, #ef444460, transparent)',
        }}
        initial={{ opacity: 0 }}
        animate={{
          opacity: [0, 0.6, 0],
          scale: [0.8, 1.2, 0.8],
        }}
        transition={{ duration: 0.5 }}
      />

      {/* Token (pauses, then slides down) */}
      <motion.div
        className='absolute w-10 h-10 rounded-full bg-blue-500 z-10'
        style={{ left: from.x, top: from.y }}
        initial={{ y: 0 }}
        animate={{
          y: [
            0, // Start
            0, // Pause (emotional pause)
            to.y - from.y, // Smooth slide down
          ],
        }}
        transition={{
          duration: pauseDuration + duration,
          times: [0, pauseDuration / (pauseDuration + duration), 1],
          ease: 'easeInOut', // Never jump-cut
        }}
        onAnimationStart={() => {
          // Play sound after pause
          setTimeout(() => {
            snakeLadderSounds.playSnakeBite();
          }, pauseDuration * 1000);
        }}
        onAnimationComplete={() => {
          // Extra breathing room after pain
          setTimeout(onComplete, SNAKELADDER_CONFIG.TIMING.BREATHING_ROOM_MS * 1.5);
        }}
      />
    </>
  );
};
