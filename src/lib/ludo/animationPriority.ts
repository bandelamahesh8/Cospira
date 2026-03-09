/**
 * Animation Priority Queue for Ludo
 * Enforces strict animation budget: 1 major + 2 micro effects max
 */

import { LUDO_CONFIG } from './config';

export type AnimationPriority = 'KILL' | 'SIX' | 'DICE_ROLL' | 'TOKEN_MOVE' | 'UI_GLOW';

export interface QueuedAnimation {
  id: string;
  type: AnimationPriority;
  execute: () => void;
  duration: number;
  timestamp: number;
}

class AnimationQueue {
  private queue: QueuedAnimation[] = [];
  private activeAnimations: Set<string> = new Set();
  private activeMajor: string | null = null;
  private activeMicroCount: number = 0;

  /**
   * Add animation to queue
   * Will execute immediately if budget allows, otherwise queued
   */
  add(animation: Omit<QueuedAnimation, 'timestamp'>): void {
    const queuedAnimation: QueuedAnimation = {
      ...animation,
      timestamp: Date.now(),
    };

    const priority = this.getPriority(animation.type);

    if (this.canExecute(animation.type, priority)) {
      this.execute(queuedAnimation, priority);
    } else {
      // Queue for later
      this.queue.push(queuedAnimation);
      this.sortQueue();
    }
  }

  /**
   * Get priority value for animation type
   */
  private getPriority(type: AnimationPriority): number {
    return LUDO_CONFIG.ANIMATION.PRIORITY_LEVELS[type];
  }

  /**
   * Check if animation can execute now
   */
  private canExecute(_type: AnimationPriority, priority: number): boolean {
    // HIGH priority (kill) can override everything
    if (priority >= 100) {
      // Cancel lower priority animations
      this.cancelLowerPriority(priority);
      return true;
    }

    const isMajor = this.isMajor(priority);

    // Check major animation limit
    if (isMajor && this.activeMajor !== null) {
      return false;
    }

    // Check micro effect limit
    if (!isMajor && this.activeMicroCount >= LUDO_CONFIG.ANIMATION.MAX_MICRO_EFFECTS) {
      return false;
    }

    return true;
  }

  /**
   * Determine if animation is major (priority >= 60)
   */
  private isMajor(priority: number): boolean {
    return priority >= 60; // DICE_ROLL and above
  }

  /**
   * Cancel animations with lower priority
   */
  private cancelLowerPriority(priority: number): void {
    // Remove from queue
    this.queue = this.queue.filter((anim) => {
      const animPriority = this.getPriority(anim.type);
      return animPriority >= priority;
    });

    // Note: Active animations will complete naturally
    // We don't forcefully cancel them to avoid jarring UX
  }

  /**
   * Execute animation
   */
  private execute(animation: QueuedAnimation, priority: number): void {
    this.activeAnimations.add(animation.id);

    const isMajor = this.isMajor(priority);
    if (isMajor) {
      this.activeMajor = animation.id;
    } else {
      this.activeMicroCount++;
    }

    // Execute the animation
    animation.execute();

    // Clean up after duration
    setTimeout(() => {
      this.activeAnimations.delete(animation.id);

      if (this.activeMajor === animation.id) {
        this.activeMajor = null;
      }

      if (!isMajor) {
        this.activeMicroCount = Math.max(0, this.activeMicroCount - 1);
      }

      this.processQueue();
    }, animation.duration);
  }

  /**
   * Sort queue by priority (highest first)
   */
  private sortQueue(): void {
    this.queue.sort((a, b) => {
      const priorityA = this.getPriority(a.type);
      const priorityB = this.getPriority(b.type);

      if (priorityA !== priorityB) {
        return priorityB - priorityA;
      }

      // Same priority, older first
      return a.timestamp - b.timestamp;
    });
  }

  /**
   * Process queued animations
   */
  private processQueue(): void {
    while (this.queue.length > 0) {
      const next = this.queue[0];
      const priority = this.getPriority(next.type);

      if (this.canExecute(next.type, priority)) {
        this.queue.shift();
        this.execute(next, priority);
      } else {
        break; // Can't execute, wait for current animations to finish
      }
    }
  }

  /**
   * Clear all queued animations
   */
  clear(): void {
    this.queue = [];
  }

  /**
   * Get queue status for debugging
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      activeCount: this.activeAnimations.size,
      activeMajor: this.activeMajor,
      activeMicroCount: this.activeMicroCount,
    };
  }
}

// Singleton instance
export const ludoAnimationQueue = new AnimationQueue();
