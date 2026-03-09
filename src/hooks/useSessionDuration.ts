/**
 * Session Duration Hook
 * Tracks how long the user has been playing for anti-fatigue features
 */

import { useState, useEffect } from 'react';
import { CHESS_CONFIG } from '@/lib/chess/config';

export const useSessionDuration = () => {
  const [sessionStart] = useState(Date.now());
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    // Update every minute
    const interval = setInterval(() => {
      setDuration(Date.now() - sessionStart);
    }, 60000);

    // Also update immediately
    setDuration(Date.now() - sessionStart);

    return () => clearInterval(interval);
  }, [sessionStart]);

  const minutes = Math.floor(duration / 60000);
  const isFatigued = minutes >= (CHESS_CONFIG.VISUAL.FATIGUE_THRESHOLD_MINUTES || 15);

  return {
    minutes,
    isFatigued,
    sessionStart,
  };
};
