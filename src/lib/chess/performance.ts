/**
 * Chess Performance Monitor
 * Tracks frame times, animation performance, and enforces performance budgets
 */

import { CHESS_CONFIG } from './config';

class ChessPerformanceMonitor {
  private frameTimings: number[] = [];
  private animationCount = 0;
  private assetsPreloaded = false;

  /**
   * Measure execution time of a callback and warn if it exceeds budget
   */
  measureFrame(callback: () => void, label = 'Frame') {
    if (!CHESS_CONFIG.PERFORMANCE.ENABLE_PERFORMANCE_MONITORING) {
      callback();
      return;
    }

    const start = performance.now();
    callback();
    const duration = performance.now() - start;

    this.frameTimings.push(duration);

    // Keep only last 100 measurements
    if (this.frameTimings.length > 100) {
      this.frameTimings.shift();
    }

    if (duration > CHESS_CONFIG.PERFORMANCE.MAX_FRAME_TIME_MS) {
      console.warn(
        `⚠️ [Chess Performance] ${label} exceeded budget: ${duration.toFixed(2)}ms (budget: ${CHESS_CONFIG.PERFORMANCE.MAX_FRAME_TIME_MS}ms)`
      );
    }

    if (duration > CHESS_CONFIG.PERFORMANCE.CRITICAL_FRAME_TIME_MS) {
      console.error(
        `❌ [Chess Performance] ${label} CRITICAL: ${duration.toFixed(2)}ms (critical: ${CHESS_CONFIG.PERFORMANCE.CRITICAL_FRAME_TIME_MS}ms)`
      );
    }
  }

  /**
   * Track concurrent animations to enforce budget
   */
  trackAnimation(_animationName: string, callback: () => void) {
    if (this.animationCount >= CHESS_CONFIG.PERFORMANCE.MAX_CONCURRENT_ANIMATIONS) {
      console.warn(
        `⚠️ [Chess Performance] Animation budget exceeded. Current: ${this.animationCount}, Max: ${CHESS_CONFIG.PERFORMANCE.MAX_CONCURRENT_ANIMATIONS}`
      );
    }

    this.animationCount++;

    try {
      callback();
    } finally {
      // Decrement after animation duration
      setTimeout(() => {
        this.animationCount--;
      }, CHESS_CONFIG.PERFORMANCE.MAX_ANIMATION_DURATION_MS);
    }
  }

  /**
   * Preload chess piece images and sounds
   */
  async preloadAssets(): Promise<void> {
    if (this.assetsPreloaded || !CHESS_CONFIG.PERFORMANCE.PRELOAD_ASSETS) {
      return;
    }

    const start = performance.now();

    try {
      // Preload piece images (if using custom pieces)
      // const pieceImages = ['pawn', 'knight', 'bishop', 'rook', 'queen', 'king'];
      // const colors = ['white', 'black'];
      // const imagePromises = pieceImages.flatMap(piece =>
      //   colors.map(color => {
      //     const img = new Image();
      //     img.src = `/assets/chess/${color}-${piece}.svg`;
      //     return img.decode();
      //   })
      // );

      // Preload sounds (Phase 2)
      // const soundPromises = [
      //   fetch('/assets/sounds/chess-move.mp3'),
      //   fetch('/assets/sounds/chess-capture.mp3'),
      // ];

      // await Promise.all([...imagePromises, ...soundPromises]);

      this.assetsPreloaded = true;
      const duration = performance.now() - start;

      // eslint-disable-next-line no-console
      console.log(`✅ [Chess Performance] Assets preloaded in ${duration.toFixed(2)}ms`);
    } catch (error) {
      console.error('❌ [Chess Performance] Asset preload failed:', error);
    }
  }

  /**
   * Get performance statistics
   */
  getStats() {
    if (this.frameTimings.length === 0) {
      return null;
    }

    const avg = this.frameTimings.reduce((a, b) => a + b, 0) / this.frameTimings.length;
    const max = Math.max(...this.frameTimings);
    const min = Math.min(...this.frameTimings);

    return {
      averageFrameTime: avg.toFixed(2),
      maxFrameTime: max.toFixed(2),
      minFrameTime: min.toFixed(2),
      currentAnimations: this.animationCount,
      assetsPreloaded: this.assetsPreloaded,
    };
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.frameTimings = [];
    this.animationCount = 0;
  }
}

// Singleton instance
export const performanceMonitor = new ChessPerformanceMonitor();
