/**
 * Comfort Scaling Utilities
 * Device-aware softness and accessibility
 */

import { SNAKELADDER_CONFIG, isNightTime } from './config';

/**
 * Get contrast level based on time and fatigue
 */
export const getContrastLevel = (): number => {
  if (!SNAKELADDER_CONFIG.COMFORT.NIGHT_MODE_AUTO) {
    return 1.0;
  }

  if (isNightTime()) {
    return SNAKELADDER_CONFIG.COMFORT.NIGHT_CONTRAST_REDUCTION;
  }

  return 1.0;
};

/**
 * Get dice hitbox size (larger on small screens)
 */
export const getDiceHitboxSize = (baseSize: number): number => {
  if (typeof window === 'undefined') return baseSize;

  const screenWidth = window.innerWidth;

  // Small screens get larger hitbox
  if (screenWidth < 375) {
    return baseSize * SNAKELADDER_CONFIG.COMFORT.LARGE_HITBOX_MULTIPLIER;
  }

  return baseSize;
};

/**
 * Apply visual softening after snake fall
 */
export const getSoftenedColors = (baseColor: string, soften: boolean): string => {
  if (!soften || !SNAKELADDER_CONFIG.COMFORT.COLOR_SOFTEN_AFTER_FALL) {
    return baseColor;
  }

  // Reduce saturation slightly
  return `${baseColor}cc`; // Add alpha for softness
};

/**
 * Get board zoom level after fall
 */
export const getBoardZoomAfterFall = (): number => {
  if (!SNAKELADDER_CONFIG.COMFORT.ZOOM_OUT_AFTER_FALL) {
    return 1.0;
  }

  return 0.95; // Slight zoom out for emotional cushioning
};
