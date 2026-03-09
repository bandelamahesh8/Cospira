import { useState, useEffect, useCallback } from 'react';
import { roomEventBus, BreakoutEventMap } from '@/lib/breakout/EventBus';
import { toast } from 'sonner';

/**
 * useEmotionalGuardian
 * ─────────────────────────────────────────────────────────────
 * Reacts to EMOTIONAL_SPIKE events from the AIEngine and manages
 * the local "Cooldown" state for a breakout room.
 */
export const useEmotionalGuardian = (breakoutId: string | undefined) => {
  const [isCoolingDown, setIsCoolingDown] = useState(false);
  const [cooldownDuration, setCooldownDuration] = useState(5);

  const triggerCooldown = useCallback(
    (intensity: 'LOW' | 'MEDIUM' | 'HIGH') => {
      const duration = intensity === 'HIGH' ? 8 : 5;
      setCooldownDuration(duration);
      setIsCoolingDown(true);

      roomEventBus.emit('AUTOMATION_EXECUTED', {
        action: 'Neural Guardian Intervention',
        targetId: breakoutId || 'unknown',
        description: `Triggered a ${duration}s collective cooldown due to high emotional tension.`,
        timestamp: Date.now(),
      });
    },
    [breakoutId]
  );

  useEffect(() => {
    if (!breakoutId) return;

    const handleSpike = (payload: BreakoutEventMap['EMOTIONAL_SPIKE']) => {
      if (payload.breakoutId !== breakoutId) return;

      // Only trigger for MEDIUM or HIGH intensity
      if (payload.intensity === 'MEDIUM' || payload.intensity === 'HIGH') {
        toast.error('Atmosphere tension detected. Triggering collective cooldown.', {
          description: 'Take a breath. Rematch/Interaction available shortly.',
        });
        triggerCooldown(payload.intensity);
      }
    };

    roomEventBus.on('EMOTIONAL_SPIKE', handleSpike);
    return () => roomEventBus.off('EMOTIONAL_SPIKE', handleSpike);
  }, [breakoutId, triggerCooldown]);

  return {
    isCoolingDown,
    cooldownDuration,
    completeCooldown: () => setIsCoolingDown(false),
  };
};
