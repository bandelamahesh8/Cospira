/**
 * DiceEngine.ts
 * Cryptographically seeded RNG, roll result serialization
 */

export class DiceEngine {
  /**
   * Generates a secure random number between 1 and 6
   * @param seed Optional seed for deterministic outcomes (if needed for testing)
   */
  static roll(seed?: string): number {
    if (seed) {
      // Deterministic roll for testing or sync verification
      let hash = 0;
      for (let i = 0; i < seed.length; i++) {
        hash = (hash << 5) - hash + seed.charCodeAt(i);
        hash |= 0;
      }
      return (Math.abs(hash) % 6) + 1;
    }

    // Cryptographically secure RNG
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return (array[0] % 6) + 1;
  }

  /**
   * Serializes a roll result for transmission
   */
  static serialize(value: number, sequence: number) {
    return {
      value,
      seq: sequence,
      ts: Date.now(),
    };
  }
}
