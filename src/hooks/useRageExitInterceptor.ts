/**
 * Rage Exit Interceptor Hook
 * Adds friction to exits after losses to prevent rage quits
 */

import { useState, useEffect, useCallback } from 'react';
import { LUDO_CONFIG } from '@/lib/ludo/config';

export const useRageExitInterceptor = () => {
  const [justLost, setJustLost] = useState(false);
  const [showExitWarning, setShowExitWarning] = useState(false);

  useEffect(() => {
    if (!LUDO_CONFIG.FEATURES.RAGE_EXIT_INTERCEPTOR) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (justLost) {
        e.preventDefault();
        e.returnValue = 'Game still running';
        setShowExitWarning(true);

        // Delay exit by 300ms
        setTimeout(() => {
          setJustLost(false);
          setShowExitWarning(false);
        }, 300);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [justLost]);

  const triggerLoss = useCallback(() => {
    setJustLost(true);

    // Auto-reset after 5 seconds
    setTimeout(() => {
      setJustLost(false);
    }, 5000);
  }, []);

  const reset = useCallback(() => {
    setJustLost(false);
    setShowExitWarning(false);
  }, []);

  return {
    triggerLoss,
    reset,
    showExitWarning,
  };
};
