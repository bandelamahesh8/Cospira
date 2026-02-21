/**
 * Dice Roll Component
 * Hope engine - emotional reset with each roll
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { SNAKELADDER_CONFIG } from '@/lib/snakeladder/config';

interface DiceRollProps {
  onRoll: (value: number) => void;
  disabled?: boolean;
}

export const SnakeLadderDice = ({ onRoll, disabled }: DiceRollProps) => {
  const [isRolling, setIsRolling] = useState(false);
  const [currentFace, setCurrentFace] = useState(1);

  const rollDice = async () => {
    if (disabled || isRolling) return;

    setIsRolling(true);

    // Slow-to-fast roll (accelerating)
    const totalDuration = SNAKELADDER_CONFIG.TIMING.DICE_ROLL_MS;
    const steps = 10;

    for (let i = 0; i < steps; i++) {
      // Accelerating delay
      const delay = (i / steps) * (totalDuration / steps) * (1 + i * 0.15);
      
      setTimeout(() => {
        setCurrentFace(Math.floor(Math.random() * 6) + 1);
      }, delay);
    }

    // Wait for roll to complete
    await new Promise(resolve => setTimeout(resolve, totalDuration));

    // Brief pause before reveal (suspense)
    await new Promise(resolve => 
      setTimeout(resolve, SNAKELADDER_CONFIG.TIMING.DICE_REVEAL_PAUSE_MS)
    );

    // Get final result
    const result = Math.floor(Math.random() * 6) + 1;
    setCurrentFace(result);
    setIsRolling(false);
    onRoll(result);
  };

  return (
    <motion.button
      onClick={rollDice}
      disabled={disabled || isRolling}
      className="relative w-20 h-20 bg-white rounded-2xl shadow-lg flex items-center justify-center text-3xl font-bold cursor-pointer"
      style={{
        opacity: disabled ? 0.4 : 1,
      }}
      // Gentle bounce (not aggressive)
      animate={isRolling ? {
        y: [0, -4, 0],
        rotate: [0, 5, -5, 0],
      } : {}}
      transition={{
        y: { duration: 0.7, ease: 'easeInOut', repeat: isRolling ? Infinity : 0 },
        rotate: { duration: 0.8, ease: 'easeInOut', repeat: isRolling ? Infinity : 0 },
      }}
      whileHover={!disabled ? { scale: 1.05 } : {}}
      whileTap={!disabled ? { scale: 0.95 } : {}}
    >
      {currentFace}
    </motion.button>
  );
};
