/**
 * Touch Forgiveness Hook
 * Corrects mis-taps to nearest valid target within radius
 */

import { useState, useCallback } from 'react';
import { LUDO_CONFIG } from '@/lib/ludo/config';

interface Target {
  id: string;
  x: number;
  y: number;
}

export const useTouchForgiveness = () => {
  const [forgivenessRadius] = useState(LUDO_CONFIG.DEVICE.TOUCH_FORGIVENESS_RADIUS_PX);

  /**
   * Correct tap to nearest valid target
   * Returns null if no target within forgiveness radius
   */
  const correctTap = useCallback((
    tapX: number,
    tapY: number,
    validTargets: Target[]
  ): Target | null => {
    if (validTargets.length === 0) return null;

    // Find nearest valid target within radius
    let nearest: { target: Target | null; distance: number } = {
      target: null,
      distance: Infinity,
    };

    for (const target of validTargets) {
      const distance = Math.sqrt(
        Math.pow(tapX - target.x, 2) + Math.pow(tapY - target.y, 2)
      );

      if (distance < forgivenessRadius && distance < nearest.distance) {
        nearest = { target, distance };
      }
    }

    return nearest.target;
  }, [forgivenessRadius]);

  /**
   * Get expanded hitbox size for low-end devices
   */
  const getHitboxMultiplier = useCallback((): number => {
    return LUDO_CONFIG.DEVICE.LARGER_HITBOX_MULTIPLIER;
  }, []);

  return {
    correctTap,
    getHitboxMultiplier,
    forgivenessRadius,
  };
};
