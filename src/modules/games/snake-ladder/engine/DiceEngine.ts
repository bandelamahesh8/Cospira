import { randomInt } from 'crypto';

export class DiceEngine {
  /**
   * Generates a cryptographically secure random dice value between 1 and 6.
   * Host-authoritative; clients never generate dice.
   */
  static roll(): number {
    return randomInt(1, 7); // inclusive min, exclusive max
  }

  /**
   * Verifies a dice value is valid (1-6).
   */
  static isValid(value: number): boolean {
    return Number.isInteger(value) && value >= 1 && value <= 6;
  }
}