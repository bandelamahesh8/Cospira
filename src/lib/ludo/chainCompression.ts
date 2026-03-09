/**
 * Chain Event Compression Manager
 * Speeds up animations during consecutive events (multiple sixes, kills)
 */

import { LUDO_CONFIG } from './config';

export class ChainEventManager {
  private chainCount: number = 0;
  private lastEventTime: number = 0;
  private readonly CHAIN_TIMEOUT_MS = 3000; // Reset chain after 3s

  /**
   * Get animation speed multiplier based on chain count
   * Returns value < 1.0 for faster animations
   */
  getAnimationSpeed(): number {
    const now = Date.now();
    const timeSinceLastEvent = now - this.lastEventTime;

    // Reset chain if too much time passed
    if (timeSinceLastEvent > this.CHAIN_TIMEOUT_MS) {
      this.chainCount = 0;
    }

    this.chainCount++;
    this.lastEventTime = now;

    // Calculate speed based on chain count
    if (this.chainCount === 1) {
      return 1.0; // Normal speed
    } else if (this.chainCount === 2) {
      // 20% faster
      return 1.0 - LUDO_CONFIG.ANIMATION.COMPRESSION.SECOND_SIX_SPEEDUP;
    } else if (this.chainCount >= 3) {
      // 40% faster
      return 1.0 - LUDO_CONFIG.ANIMATION.COMPRESSION.THIRD_CHAIN_SPEEDUP;
    }

    return 1.0;
  }

  /**
   * Check if micro-effects should be skipped
   * Returns true for 3rd+ event in chain
   */
  shouldSkipMicroEffects(): boolean {
    return this.chainCount >= 3 && LUDO_CONFIG.ANIMATION.COMPRESSION.THIRD_CHAIN_SKIP_MICRO;
  }

  /**
   * Get current chain count
   */
  getChainCount(): number {
    return this.chainCount;
  }

  /**
   * Manually reset chain
   */
  reset(): void {
    this.chainCount = 0;
    this.lastEventTime = 0;
  }

  /**
   * Get adjusted duration for animation
   */
  getAdjustedDuration(baseDuration: number): number {
    const speedMultiplier = this.getAnimationSpeed();
    return Math.round(baseDuration * speedMultiplier);
  }
}

// Singleton instance
export const chainEventManager = new ChainEventManager();
