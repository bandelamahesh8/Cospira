/**
 * Fatigue Protection Manager
 * Gradual simplification over long sessions
 */

export class FatigueProtection {
  private turnCount: number = 0;
  private sessionStartTime: number = Date.now();

  /**
   * Increment turn count
   */
  incrementTurn(): void {
    this.turnCount++;
  }

  /**
   * Get session duration in minutes
   */
  getSessionDuration(): number {
    return (Date.now() - this.sessionStartTime) / 1000 / 60;
  }

  /**
   * Check if session is long
   */
  isLongSession(): boolean {
    return this.getSessionDuration() > 10; // 10+ minutes
  }

  /**
   * Get ambient motion reduction factor
   */
  getAmbientReduction(): number {
    if (!this.isLongSession()) return 1.0;

    // Reduce ambient motion by 50% in long sessions
    return 0.5;
  }

  /**
   * Get contrast reduction for fatigue
   */
  getContrastReduction(): number {
    const duration = this.getSessionDuration();

    if (duration < 10) return 1.0;
    if (duration < 20) return 0.9; // 10% reduction
    return 0.8; // 20% reduction for 20+ min
  }

  /**
   * Reset session
   */
  reset(): void {
    this.turnCount = 0;
    this.sessionStartTime = Date.now();
  }
}

export const fatigueProtection = new FatigueProtection();
