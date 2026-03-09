/**
 * Kill Animation Component
 * Features: 300ms slow-mo, sound + haptic sync
 */

import { motion } from 'framer-motion';
import { LUDO_CONFIG } from '@/lib/ludo/config';
import { ludoAnimationQueue } from '@/lib/ludo/animationPriority';

interface KillAnimationProps {
  fromPosition: { x: number; y: number };
  toPosition: { x: number; y: number };
  attackerColor: string;
  victimColor: string;
  onComplete: () => void;
}

export const KillAnimation = ({
  fromPosition,
  toPosition,
  attackerColor,
  victimColor,
  onComplete,
}: KillAnimationProps) => {
  const duration = LUDO_CONFIG.EMOTION.KILL_SLOWMO_MS;

  // Add to animation queue with HIGH priority
  ludoAnimationQueue.add({
    id: `kill-${Date.now()}`,
    type: 'KILL',
    duration,
    execute: () => {
      // Play sound
      playKillSound();

      // Trigger haptic feedback
      triggerHaptic('heavy');
    },
  });

  return (
    <motion.div
      className='absolute pointer-events-none z-50'
      initial={{
        x: fromPosition.x,
        y: fromPosition.y,
        scale: 1,
      }}
      animate={{
        x: toPosition.x,
        y: toPosition.y,
        scale: [1, 1.3, 1], // Micro-drama: brief scale-up
      }}
      transition={{
        duration: duration / 1000,
        times: [0, 0.5, 1], // Scale peaks at midpoint
        ease: 'easeInOut',
      }}
      onAnimationComplete={onComplete}
    >
      {/* Attacker token */}
      <div
        className='w-8 h-8 rounded-full'
        style={{
          backgroundColor: attackerColor,
          boxShadow: `0 0 20px ${attackerColor}`,
        }}
      />

      {/* Impact effect */}
      <motion.div
        className='absolute inset-0 rounded-full'
        initial={{ scale: 0, opacity: 1 }}
        animate={{ scale: 2, opacity: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          backgroundColor: victimColor,
        }}
      />
    </motion.div>
  );
};

/**
 * Play kill sound effect
 */
const playKillSound = () => {
  // TODO: Implement sound system similar to Chess
  const audio = new Audio('/sounds/kill.mp3');
  audio.volume = 0.5;
  audio.play().catch(() => {});
};

/**
 * Trigger haptic feedback
 */
const triggerHaptic = (intensity: 'light' | 'medium' | 'heavy') => {
  if ('vibrate' in navigator) {
    const patterns = {
      light: 10,
      medium: 20,
      heavy: 50,
    };
    navigator.vibrate(patterns[intensity]);
  }
};
