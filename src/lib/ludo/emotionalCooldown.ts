/**
 * Emotional Cooldown Manager
 * Features: Micro-dead zones after big events to restore contrast
 */

import { LUDO_CONFIG } from './config';

export class EmotionalCooldown {
  private lastSpikeTime: number = 0;
  private spikeCount: number = 0;
  private readonly COOLDOWN_MS = LUDO_CONFIG.EMOTION.COOLDOWN_AFTER_SPIKE_MS;
  private readonly RESET_AFTER_MS = 3000;

  /**
   * Check if effects should be suppressed
   */
  shouldSuppressEffect(): boolean {
    const now = Date.now();
    const timeSinceSpike = now - this.lastSpikeTime;
    
    // Suppress for cooldown period after spike
    return timeSinceSpike < this.COOLDOWN_MS;
  }

  /**
   * Register an emotional spike (kill, six, etc.)
   */
  registerSpike(): void {
    const now = Date.now();
    
    // Reset count if too much time passed
    if (now - this.lastSpikeTime > this.RESET_AFTER_MS) {
      this.spikeCount = 0;
    }
    
    this.lastSpikeTime = now;
    this.spikeCount++;
  }

  /**
   * Get tone-down factor for back-to-back spikes
   */
  getToneDownFactor(): number {
    if (this.spikeCount <= 1) return 1.0;
    if (this.spikeCount === 2) return 0.7; // 30% less intense
    return 0.5; // 50% less intense for 3+
  }

  /**
   * Reset cooldown
   */
  reset(): void {
    this.lastSpikeTime = 0;
    this.spikeCount = 0;
  }
}

export const emotionalCooldown = new EmotionalCooldown();
