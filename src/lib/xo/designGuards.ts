/**
 * XO Design Guards
 * Protect minimalism forever
 */

import { XO_CONFIG } from './config';

/**
 * Sound guard - enforce noise budget
 */
export const guardSound = (volume: number): boolean => {
  if (volume > XO_CONFIG.SOUND.MAX_VOLUME) {
    console.error(`[XO Guard] Sound rejected: volume ${volume} exceeds max ${XO_CONFIG.SOUND.MAX_VOLUME}`);
    return false;
  }
  return true;
};

/**
 * Animation guard - enforce timing limits
 */
export const guardAnimation = (duration: number): boolean => {
  const MAX_DURATION = 150; // ms
  
  if (duration > MAX_DURATION) {
    console.error(`[XO Guard] Animation rejected: ${duration}ms exceeds max ${MAX_DURATION}ms`);
    return false;
  }
  return true;
};

/**
 * UI element guard - enforce anti-overdesign lock
 */
export const guardUIElement = (currentCount: number, adding: boolean = true): boolean => {
  if (adding && currentCount >= XO_CONFIG.DESIGN_LOCK.MAX_UI_ELEMENTS) {
    console.error(`[XO Guard] UI element rejected: max ${XO_CONFIG.DESIGN_LOCK.MAX_UI_ELEMENTS} elements`);
    console.error('[XO Guard] Remove an existing element before adding new one');
    return false;
  }
  return true;
};

/**
 * Noise budget guard - enforce per-event limits
 */
export const guardNoiseBudget = (event: {
  sounds: number;
  animations: number;
  stateChanges: number;
}): boolean => {
  const { sounds, animations, stateChanges } = event;
  
  if (sounds > XO_CONFIG.NOISE_BUDGET.MAX_SOUNDS_PER_EVENT) {
    console.error(`[XO Guard] Event rejected: ${sounds} sounds exceeds max ${XO_CONFIG.NOISE_BUDGET.MAX_SOUNDS_PER_EVENT}`);
    return false;
  }
  
  if (animations > XO_CONFIG.NOISE_BUDGET.MAX_ANIMATIONS_PER_EVENT) {
    console.error(`[XO Guard] Event rejected: ${animations} animations exceeds max ${XO_CONFIG.NOISE_BUDGET.MAX_ANIMATIONS_PER_EVENT}`);
    return false;
  }
  
  if (stateChanges > XO_CONFIG.NOISE_BUDGET.MAX_STATE_CHANGES_PER_TURN) {
    console.error(`[XO Guard] Event rejected: ${stateChanges} state changes exceeds max ${XO_CONFIG.NOISE_BUDGET.MAX_STATE_CHANGES_PER_TURN}`);
    return false;
  }
  
  return true;
};

/**
 * Final litmus test for XO features
 */
export const xoLitmusTest = (feature: {
  reducesNoise: boolean;
  increasesTension: boolean;
  respectsIntelligence: boolean;
  goodAfter20Matches: boolean;
}): boolean => {
  const { reducesNoise, increasesTension, respectsIntelligence, goodAfter20Matches } = feature;
  
  if (!reducesNoise || !increasesTension || !respectsIntelligence || !goodAfter20Matches) {
    console.error('[XO Guard] Feature rejected: failed litmus test', feature);
    return false;
  }
  
  return true;
};

/**
 * Permanent NO list checker
 */
export const checkPermanentNoList = (featureName: string): boolean => {
  const PERMANENT_NO = [
    'tutorial',
    'hint',
    'emote',
    'theme',
    'celebration',
    'personality',
    'ai',
    'gradient',
    'shadow',
    'blur',
  ];
  
  const lowerName = featureName.toLowerCase();
  const isBlocked = PERMANENT_NO.some(blocked => lowerName.includes(blocked));
  
  if (isBlocked) {
    console.error(`[XO Guard] Feature "${featureName}" rejected: on permanent NO list`);
    return false;
  }
  
  return true;
};
