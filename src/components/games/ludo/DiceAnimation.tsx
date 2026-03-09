/**
 * Ludo Dice Animation Component
 * Features: Luck transparency, dice ownership psychology
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { LUDO_CONFIG } from '@/lib/ludo/config';
import { ludoAnimationQueue } from '@/lib/ludo/animationPriority';
import { chainEventManager } from '@/lib/ludo/chainCompression';

interface DiceAnimationProps {
  playerColor: string;
  onRollComplete: (value: number) => void;
  disabled?: boolean;
}

export const DiceAnimation = ({ playerColor, onRollComplete, disabled }: DiceAnimationProps) => {
  const [isRolling, setIsRolling] = useState(false);
  const [currentFace, setCurrentFace] = useState(1);

  const rollDice = async () => {
    if (disabled || isRolling) return;

    setIsRolling(true);

    // Get adjusted duration based on chain events
    const baseDuration = LUDO_CONFIG.ANIMATION.DICE_ROLL_MS;
    const duration = chainEventManager.getAdjustedDuration(baseDuration);

    // Add to animation queue
    ludoAnimationQueue.add({
      id: `dice-roll-${Date.now()}`,
      type: 'DICE_ROLL',
      duration,
      execute: async () => {
        // Luck transparency: Always show multiple faces (never instant)
        const faceChangeInterval = 80;
        const changes = Math.floor(duration / faceChangeInterval);

        for (let i = 0; i < changes; i++) {
          setCurrentFace(Math.floor(Math.random() * 6) + 1);
          await new Promise((resolve) => setTimeout(resolve, faceChangeInterval));
        }

        // Get final result (from server or local)
        const result = await getDiceResult();
        setCurrentFace(result);
        setIsRolling(false);
        onRollComplete(result);
      },
    });
  };

  return (
    <motion.button
      onClick={rollDice}
      disabled={disabled || isRolling}
      initial={{ x: -10 }} // Dice ownership: Slight tilt toward player
      animate={{
        x: 0,
        scale: isRolling ? [1, 1.1, 1] : 1,
        rotateX: isRolling ? 360 : 0,
        rotateY: isRolling ? 360 : 0,
      }}
      transition={{
        x: { duration: 0.3 },
        scale: { repeat: isRolling ? Infinity : 0, duration: 0.5 },
        rotateX: { duration: 0.8, ease: 'easeOut' },
        rotateY: { duration: 0.8, ease: 'easeOut' },
      }}
      className='relative w-16 h-16 rounded-lg flex items-center justify-center font-bold text-2xl cursor-pointer'
      style={{
        backgroundColor: disabled ? '#4a5568' : '#fff',
        boxShadow: `0 0 20px ${playerColor}`, // Glow inherits player color
        borderWidth: '3px',
        borderStyle: 'solid',
        borderColor: playerColor,
      }}
    >
      {currentFace}

      {/* Dice dots could be rendered here instead of number */}
    </motion.button>
  );
};

/**
 * Mock function - replace with actual server call
 */
const getDiceResult = async (): Promise<number> => {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 100));
  return Math.floor(Math.random() * 6) + 1;
};
