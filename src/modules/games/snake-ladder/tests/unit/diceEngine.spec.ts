import { DiceEngine } from '../../engine/DiceEngine';

describe('DiceEngine', () => {
  it('should generate valid dice values', () => {
    for (let i = 0; i < 100; i++) {
      const value = DiceEngine.roll();
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(6);
    }
  });

  it('should validate dice values', () => {
    expect(DiceEngine.isValid(1)).toBe(true);
    expect(DiceEngine.isValid(6)).toBe(true);
    expect(DiceEngine.isValid(0)).toBe(false);
    expect(DiceEngine.isValid(7)).toBe(false);
  });
});
