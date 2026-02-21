/**
 * Endgame Acceleration Utility
 * Features: Faster animations in late game
 */

import { LUDO_CONFIG } from './config';

export class EndgameAccelerator {
  /**
   * Get animation speed multiplier based on game progress
   */
  getEndgameSpeed(tokensInHome: number, totalTokens: number = 4): number {
    const homePercent = tokensInHome / totalTokens;
    
    // 3+ tokens home = 40% faster
    if (tokensInHome >= 3) {
      return 0.6;
    }
    
    // 2 tokens home = 20% faster
    if (tokensInHome >= 2) {
      return 0.8;
    }
    
    return 1.0; // Normal speed
  }

  /**
   * Check if in endgame phase
   */
  isEndgame(tokensInHome: number): boolean {
    return tokensInHome >= 2;
  }

  /**
   * Get adjusted duration for endgame
   */
  getAdjustedDuration(baseDuration: number, tokensInHome: number): number {
    const speedMultiplier = this.getEndgameSpeed(tokensInHome);
    return Math.round(baseDuration * speedMultiplier);
  }
}

export const endgameAccelerator = new EndgameAccelerator();
