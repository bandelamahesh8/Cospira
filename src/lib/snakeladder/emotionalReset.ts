/**
 * Emotional Reset Manager
 * Clean slate each turn - no emotional carryover
 */

import { SNAKELADDER_CONFIG } from './config';

export class EmotionalReset {
  /**
   * Reset board to neutral state
   */
  async resetToNeutral(): Promise<void> {
    // Fade all highlights
    this.fadeHighlights();
    
    // Return board to calm state
    await this.returnToCalmState();
    
    // Brief pause for clean slate
    await new Promise(resolve => 
      setTimeout(resolve, SNAKELADDER_CONFIG.TIMING.TURN_TRANSITION_MS)
    );
  }

  /**
   * Fade all highlights
   */
  private fadeHighlights(): void {
    // Remove all active glows, warnings, etc.
    const highlights = document.querySelectorAll('.highlight, .warning, .glow');
    highlights.forEach(el => {
      (el as HTMLElement).style.opacity = '0';
    });
  }

  /**
   * Return board to calm state
   */
  private async returnToCalmState(): Promise<void> {
    // Restore normal opacity
    const board = document.querySelector('.board');
    if (board) {
      (board as HTMLElement).style.opacity = '1';
      (board as HTMLElement).style.transform = 'scale(1)';
    }
  }
}

export const emotionalReset = new EmotionalReset();
