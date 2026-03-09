/**
 * Calm Exit Component
 * Gentle fade-out on exit - never trap users
 */

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface CalmExitProps {
  isExiting: boolean;
  onExitComplete?: () => void;
}

export const CalmExit = ({ isExiting, onExitComplete }: CalmExitProps) => {
  const [showExit, setShowExit] = useState(false);

  useEffect(() => {
    if (isExiting) {
      setShowExit(true);
    }
  }, [isExiting]);

  if (!showExit) return null;

  return (
    <motion.div
      className='fixed inset-0 bg-slate-900 z-50 flex items-center justify-center'
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.5 }} // Slow, gentle fade
      onAnimationComplete={onExitComplete}
    >
      {/* Soft ambient sound fades with screen */}
      <motion.p
        className='text-white text-xl font-light'
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.6, 0] }}
        transition={{ duration: 2 }}
      >
        Until next time...
      </motion.p>
    </motion.div>
  );
};
