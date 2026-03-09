import { useState, useEffect, useCallback, useRef } from 'react';

export function usePresence(timeoutMs: number = 60000) {
  const [isAway, setIsAway] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = useCallback(() => {
    setIsAway(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      setIsAway(true);
    }, timeoutMs);
  }, [timeoutMs]);

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

    // Throttle event listeners to avoid performance hit
    let lastReset = 0;
    const handleActivity = () => {
      const now = Date.now();
      if (now - lastReset > 1000) {
        // Only reset once per second max
        resetTimer();
        lastReset = now;
      }
    };

    events.forEach((event) => {
      window.addEventListener(event, handleActivity);
    });

    // Also watch for tab visibility
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Optional: Immediate away or faster timeout?
        // For now, let's just treat it as no activity, so timer continues.
        // Or we can force away state if they leave tab?
        // Let's stick to standard timer for now to not be annoying.
      } else {
        resetTimer();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Initial start
    resetTimer();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [resetTimer]);

  return isAway;
}
