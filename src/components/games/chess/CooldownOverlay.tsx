/**
 * Cooldown Overlay Component
 * Shows a brief cooldown after losses to prevent rage-induced rematches
 */

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface CooldownOverlayProps {
  show: boolean;
  onComplete: () => void;
  duration?: number; // seconds
}

export const CooldownOverlay = ({ show, onComplete, duration = 3 }: CooldownOverlayProps) => {
  const [countdown, setCountdown] = useState(duration);

  useEffect(() => {
    if (!show) {
      setCountdown(duration);
      return;
    }

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [show, onComplete, duration]);

  if (!show) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className='absolute inset-0 bg-slate-950/90 backdrop-blur-sm z-50 flex items-center justify-center rounded-[4rem]'
    >
      <div className='text-center space-y-6'>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className='text-slate-400 text-sm font-medium'
        >
          Take a breath...
        </motion.p>

        <motion.div
          key={countdown}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className='text-8xl font-black text-white'
        >
          {countdown}
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className='text-slate-500 text-xs'
        >
          Rematch available in {countdown}s
        </motion.p>
      </div>
    </motion.div>
  );
};
