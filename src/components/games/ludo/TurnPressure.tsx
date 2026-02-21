/**
 * Turn Pressure Component
 * Features: Anti-stall protection with gentle nudges
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LUDO_CONFIG } from '@/lib/ludo/config';

interface TurnPressureProps {
  isMyTurn: boolean;
  onTurnStart?: () => void;
}

export const TurnPressure = ({ isMyTurn, onTurnStart }: TurnPressureProps) => {
  const [timeElapsed, setTimeElapsed] = useState(0);

  useEffect(() => {
    if (!isMyTurn) {
      setTimeElapsed(0);
      return;
    }

    onTurnStart?.();
    const startTime = Date.now();

    const interval = setInterval(() => {
      setTimeElapsed(Date.now() - startTime);
    }, 100);

    return () => clearInterval(interval);
  }, [isMyTurn, onTurnStart]);

  if (!isMyTurn || !LUDO_CONFIG.FEATURES.ANTI_STALL_PROTECTION) {
    return null;
  }

  const isDelaying = timeElapsed > LUDO_CONFIG.STALL.PULSE_AFTER_MS;
  const showCountdown = timeElapsed > LUDO_CONFIG.STALL.COUNTDOWN_AFTER_MS;
  const secondsRemaining = Math.max(
    0,
    Math.floor((LUDO_CONFIG.STALL.MAX_TURN_TIME_MS - timeElapsed) / 1000)
  );

  return (
    <>
      {/* Dice pulse intensifies if player delays */}
      {isDelaying && (
        <motion.div
          className="absolute inset-0 rounded-lg pointer-events-none"
          animate={{
            boxShadow: [
              '0 0 0px rgba(59, 130, 246, 0)',
              '0 0 20px rgba(59, 130, 246, 0.6)',
              '0 0 0px rgba(59, 130, 246, 0)',
            ],
          }}
          transition={{
            repeat: Infinity,
            duration: 1,
            ease: 'easeInOut',
          }}
        />
      )}

      {/* Countdown bar appears only after long inactivity */}
      {showCountdown && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-amber-500 text-white px-3 py-1 rounded-full text-sm font-bold"
        >
          {secondsRemaining}s
        </motion.div>
      )}
    </>
  );
};
