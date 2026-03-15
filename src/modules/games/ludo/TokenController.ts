/**
 * TokenController.ts
 * Path resolution, capture logic, home-stretch entry rules, and COORDINATE MAPPING
 */

export interface Point {
  x: number;
  y: number;
}

export class TokenController {
  static readonly BOARD_CELLS = 52;
  static readonly HOME_PATH_LEN = 6;
  static readonly FINISHED_POS = 58;
  static readonly YARD_POS = -1;

  static readonly START_OFFSETS: Record<string, number> = {
    red: 0,
    green: 13,
    yellow: 26,
    blue: 39,
  };

  static readonly STAR_CELLS = [8, 13, 21, 26, 34, 39, 47, 0];

  /**
   * Translates a relative position (0-58, -1) to X,Y units (0-15)
   */
  static getCoordinates(relativePos: number, color: string, tokenIdx: number): Point {
    if (relativePos === this.YARD_POS) {
      return this.getYardCoordinates(color, tokenIdx);
    }

    if (relativePos === this.FINISHED_POS) {
      return { x: 7.5, y: 7.5 }; // Home center
    }

    if (relativePos >= this.BOARD_CELLS) {
      return this.getHomeStretchCoordinates(color, relativePos - this.BOARD_CELLS);
    }

    // Global path index
    const globalIdx = (relativePos + (this.START_OFFSETS[color] || 0)) % this.BOARD_CELLS;
    return this.getGlobalPathCoordinates(globalIdx);
  }

  private static getYardCoordinates(color: string, idx: number): Point {
    const bases: Record<string, Point> = {
      red: { x: 0, y: 0 },
      green: { x: 9, y: 0 },
      blue: { x: 0, y: 9 },
      yellow: { x: 9, y: 9 },
    };
    const base = bases[color];
    const slots = [
      { dx: 2, dy: 2 },
      { dx: 4, dy: 2 },
      { dx: 2, dy: 4 },
      { dx: 4, dy: 4 },
    ];
    const slot = slots[idx];
    return { x: base.x + slot.dx, y: base.y + slot.dy };
  }

  private static getHomeStretchCoordinates(color: string, step: number): Point {
    // step is 0-5 (cells 52-57)
    const dist = step + 1;
    switch (color) {
      case 'red':
        return { x: dist + 0.5, y: 7.5 };
      case 'green':
        return { x: 7.5, y: dist + 0.5 };
      case 'yellow':
        return { x: 14.5 - dist, y: 7.5 };
      case 'blue':
        return { x: 7.5, y: 14.5 - dist };
      default:
        return { x: 7.5, y: 7.5 };
    }
  }

  private static getGlobalPathCoordinates(index: number): Point {
    const p: Point[] = [
      { x: 1, y: 6 },
      { x: 2, y: 6 },
      { x: 3, y: 6 },
      { x: 4, y: 6 },
      { x: 5, y: 6 }, // 0-4
      { x: 6, y: 5 },
      { x: 6, y: 4 },
      { x: 6, y: 3 },
      { x: 6, y: 2 },
      { x: 6, y: 1 },
      { x: 6, y: 0 }, // 5-10
      { x: 7, y: 0 },
      { x: 8, y: 0 }, // 11-12
      { x: 8, y: 1 },
      { x: 8, y: 2 },
      { x: 8, y: 3 },
      { x: 8, y: 4 },
      { x: 8, y: 5 }, // 13-17
      { x: 9, y: 6 },
      { x: 10, y: 6 },
      { x: 11, y: 6 },
      { x: 12, y: 6 },
      { x: 13, y: 6 },
      { x: 14, y: 6 }, // 18-23
      { x: 14, y: 7 },
      { x: 14, y: 8 }, // 24-25
      { x: 13, y: 8 },
      { x: 12, y: 8 },
      { x: 11, y: 8 },
      { x: 10, y: 8 },
      { x: 9, y: 8 }, // 26-30
      { x: 8, y: 9 },
      { x: 8, y: 10 },
      { x: 8, y: 11 },
      { x: 8, y: 12 },
      { x: 8, y: 13 },
      { x: 8, y: 14 }, // 31-36
      { x: 7, y: 14 },
      { x: 6, y: 14 }, // 37-38
      { x: 6, y: 13 },
      { x: 6, y: 12 },
      { x: 6, y: 11 },
      { x: 6, y: 10 },
      { x: 6, y: 9 }, // 39-43
      { x: 5, y: 8 },
      { x: 4, y: 8 },
      { x: 3, y: 8 },
      { x: 2, y: 8 },
      { x: 1, y: 8 },
      { x: 0, y: 8 }, // 44-49
      { x: 0, y: 7 },
      { x: 0, y: 6 }, // 50-51
    ];
    const point = p[index] || { x: 7, y: 7 };
    return { x: point.x + 0.5, y: point.y + 0.5 };
  }

  static isSafe(globalIndex: number): boolean {
    return this.STAR_CELLS.includes(globalIndex);
  }

  static calculateNextPosition(currentPos: number, steps: number): number {
    if (currentPos === this.YARD_POS) {
      if (steps === 6) return 0;
      return this.YARD_POS;
    }
    const next = currentPos + steps;
    if (next > this.FINISHED_POS) return currentPos;
    return next;
  }

  static getGlobalIndex(relativePos: number, color: string): number | null {
    if (relativePos < 0 || relativePos >= this.BOARD_CELLS) return null;
    const offset = this.START_OFFSETS[color] || 0;
    return (relativePos + offset) % this.BOARD_CELLS;
  }

  static checkCaptures(
    globalIndex: number,
    attackerColor: string,
    tokens: Record<string, number[]>
  ): Array<[string, number]> {
    const captures: Array<[string, number]> = [];
    if (this.isSafe(globalIndex)) return [];

    for (const color in tokens) {
      if (color === attackerColor) continue;
      tokens[color].forEach((pos, idx) => {
        if (pos >= 0 && pos < this.BOARD_CELLS) {
          const victimGlobal = this.getGlobalIndex(pos, color);
          if (victimGlobal === globalIndex) {
            const countOnCell = tokens[color].filter((p) => p === pos).length;
            if (countOnCell === 1) {
              captures.push([color, idx]);
            }
          }
        }
      });
    }
    return captures;
  }
}
