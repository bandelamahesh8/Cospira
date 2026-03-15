import { BoardConfig } from '../types';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export const DEFAULT_SNAKES: Record<number, number> = {
  17: 7,
  27: 1,
  33: 18,
  54: 34,
  62: 19,
  64: 60,
  93: 68,
  95: 24,
  99: 78
};

export const DEFAULT_LADDERS: Record<number, number> = {
  4: 14,
  9: 31,
  20: 38,
  28: 84,
  40: 59,
  51: 67,
  63: 81,
  71: 91
};

export function validateBoardConfig(config: BoardConfig): ValidationResult {
  const errors: string[] = [];

  // 1. All snake heads > tails
  for (const [head, tail] of Object.entries(config.snakes)) {
    if (head <= tail) {
      errors.push(`Snake head ${head} must be greater than tail ${tail}`);
    }
  }

  // 2. All ladder bases < tops
  for (const [base, top] of Object.entries(config.ladders)) {
    if (base >= top) {
      errors.push(`Ladder base ${base} must be less than top ${top}`);
    }
  }

  // 3. No cell is both a snake head and a ladder base
  const snakeHeads = new Set(Object.keys(config.snakes).map(Number));
  const ladderBases = new Set(Object.keys(config.ladders).map(Number));
  const overlap = [...snakeHeads].filter(x => ladderBases.has(x));
  if (overlap.length > 0) {
    errors.push(`Cells cannot be both snake heads and ladder bases: ${overlap.join(', ')}`);
  }

  // 4. No cell is both a snake tail and a ladder top
  const snakeTails = new Set(Object.values(config.snakes));
  const ladderTops = new Set(Object.values(config.ladders));
  const tailTopOverlap = [...snakeTails].filter(x => ladderTops.has(x));
  if (tailTopOverlap.length > 0) {
    errors.push(`Cells cannot be both snake tails and ladder tops: ${tailTopOverlap.join(', ')}`);
  }

  // 5. All values strictly within [1, 100]
  const allCells = new Set([
    ...Object.keys(config.snakes).map(Number),
    ...Object.values(config.snakes),
    ...Object.keys(config.ladders).map(Number),
    ...Object.values(config.ladders)
  ]);
  for (const cell of allCells) {
    if (cell < 1 || cell > 100) {
      errors.push(`Cell ${cell} is out of range [1, 100]`);
    }
  }

  // 6. Cell 1 and cell 100 must not appear as any snake/ladder endpoint
  if (allCells.has(1)) {
    errors.push('Cell 1 cannot be a snake/ladder endpoint');
  }
  if (allCells.has(100)) {
    errors.push('Cell 100 cannot be a snake/ladder endpoint');
  }

  // 7. No two snakes share a head cell
  if (snakeHeads.size !== Object.keys(config.snakes).length) {
    errors.push('Duplicate snake heads detected');
  }

  // 8. No two ladders share a base cell
  if (ladderBases.size !== Object.keys(config.ladders).length) {
    errors.push('Duplicate ladder bases detected');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}