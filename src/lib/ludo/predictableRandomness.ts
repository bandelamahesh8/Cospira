/**
 * Predictable Randomness Utility
 * Features: Visual rhythm adjustments (DOES NOT affect outcomes)
 */

/**
 * Get dice animation weight based on recent rolls
 * VISUAL ONLY - does not affect actual dice results
 */
export const getDiceAnimationWeight = (recentRolls: number[]): number => {
  if (recentRolls.length === 0) return 1.0;
  
  const avgRoll = recentRolls.reduce((a, b) => a + b, 0) / recentRolls.length;
  
  // After low rolls, dice feels "heavier" (slower, more dramatic)
  // VISUAL ONLY - outcome is still random
  if (avgRoll < 2.5) {
    return 1.3; // 30% slower animation
  }
  
  // After high rolls, dice feels "lighter"
  if (avgRoll > 4.5) {
    return 0.9; // 10% faster animation
  }
  
  return 1.0; // Normal
};

/**
 * Check if visual cold streak (avoid repeated dead-silent turns)
 */
export const isVisualColdStreak = (recentRolls: number[]): boolean => {
  if (recentRolls.length < 3) return false;
  
  const lastThree = recentRolls.slice(-3);
  const allLow = lastThree.every(roll => roll <= 2);
  
  return allLow;
};

/**
 * Get visual emphasis level
 * VISUAL ONLY - does not change probabilities
 */
export const getVisualEmphasis = (recentRolls: number[]): 'normal' | 'subdued' | 'emphasized' => {
  if (isVisualColdStreak(recentRolls)) {
    return 'subdued'; // Avoid making it feel worse
  }
  
  const avgRoll = recentRolls.length > 0
    ? recentRolls.reduce((a, b) => a + b, 0) / recentRolls.length
    : 3.5;
  
  if (avgRoll > 4.5) {
    return 'emphasized'; // Celebrate hot streak
  }
  
  return 'normal';
};
