/**
 * Fixed-Point Physics Contract for Deterministic Carrom Simulation
 *
 * All physics coordinates, velocities, and forces are stored as integers
 * to prevent floating-point precision issues that could cause desync
 * between host and client simulations.
 */

/** Scaling factor for fixed-point arithmetic */
export const FIXED_POINT_SCALE = 1000;

/** Maximum value before overflow (prevents integer wraparound) */
export const FIXED_POINT_MAX = 2 ** 31 - 1;

/** Minimum value before underflow */
export const FIXED_POINT_MIN = -(2 ** 31);

/** Type alias for readability */
export type FixedPoint = number;

/**
 * Converts a floating-point number to fixed-point integer
 * @param value - The float value to convert
 * @returns Fixed-point integer representation
 * @throws Error if value would cause overflow
 */
export function toFixed(value: number): number {
  if (!Number.isFinite(value)) {
    throw new Error(`Invalid float value for fixed-point conversion: ${value}`);
  }

  const scaled = value * FIXED_POINT_SCALE;
  const rounded = Math.round(scaled);

  if (rounded > FIXED_POINT_MAX || rounded < FIXED_POINT_MIN) {
    throw new Error(`Fixed-point overflow: ${value} -> ${rounded}`);
  }

  return rounded;
}

/**
 * Converts a fixed-point integer back to floating-point
 * @param fixed - The fixed-point integer
 * @returns Floating-point representation
 */
export function fromFixed(fixed: number): number {
  if (!Number.isInteger(fixed)) {
    throw new Error(`Invalid fixed-point value: ${fixed} (must be integer)`);
  }

  return fixed / FIXED_POINT_SCALE;
}

/**
 * Adds two fixed-point numbers
 * @param a - First fixed-point value
 * @param b - Second fixed-point value
 * @returns Sum as fixed-point
 */
export function addFixed(a: number, b: number): number {
  const result = a + b;
  if (result > FIXED_POINT_MAX || result < FIXED_POINT_MIN) {
    throw new Error(`Fixed-point addition overflow: ${a} + ${b} = ${result}`);
  }
  return result;
}

/**
 * Subtracts two fixed-point numbers
 * @param a - Minuend
 * @param b - Subtrahend
 * @returns Difference as fixed-point
 */
export function subFixed(a: number, b: number): number {
  const result = a - b;
  if (result > FIXED_POINT_MAX || result < FIXED_POINT_MIN) {
    throw new Error(`Fixed-point subtraction overflow: ${a} - ${b} = ${result}`);
  }
  return result;
}

/**
 * Multiplies two fixed-point numbers
 * @param a - First factor
 * @param b - Second factor
 * @returns Product as fixed-point
 */
export function mulFixed(a: number, b: number): number {
  // To maintain precision, multiply first, then divide by scale
  const result = Math.round((a * b) / FIXED_POINT_SCALE);
  if (result > FIXED_POINT_MAX || result < FIXED_POINT_MIN) {
    throw new Error(`Fixed-point multiplication overflow: ${a} * ${b} = ${result}`);
  }
  return result;
}

/**
 * Divides two fixed-point numbers
 * @param a - Dividend
 * @param b - Divisor
 * @returns Quotient as fixed-point
 * @throws Error if dividing by zero
 */
export function divFixed(a: number, b: number): number {
  if (b === 0) {
    throw new Error('Fixed-point division by zero');
  }

  // To maintain precision, multiply by scale first, then divide
  const result = Math.round((a * FIXED_POINT_SCALE) / b);
  if (result > FIXED_POINT_MAX || result < FIXED_POINT_MIN) {
    throw new Error(`Fixed-point division overflow: ${a} / ${b} = ${result}`);
  }
  return result;
}

/**
 * Calculates square root of a fixed-point number
 * @param fixed - Fixed-point value
 * @returns Square root as fixed-point
 */
export function sqrtFixed(fixed: number): number {
  if (fixed < 0) {
    throw new Error(`Cannot take square root of negative fixed-point value: ${fixed}`);
  }

  const float = fromFixed(fixed);
  const sqrtFloat = Math.sqrt(float);
  return toFixed(sqrtFloat);
}

/**
 * Compares two fixed-point numbers for equality within tolerance
 * @param a - First value
 * @param b - Second value
 * @param tolerance - Fixed-point tolerance (default: 1)
 * @returns True if equal within tolerance
 */
export function equalFixed(a: number, b: number, tolerance: number = 1): boolean {
  const diff = Math.abs(a - b);
  return diff <= tolerance;
}

/**
 * Vector2 with fixed-point coordinates
 */
export interface FixedVector2 {
  x: number;
  y: number;
}

/**
 * Creates a fixed-point vector from float coordinates
 */
export function vec2ToFixed(x: number, y: number): FixedVector2 {
  return {
    x: toFixed(x),
    y: toFixed(y),
  };
}

/**
 * Converts fixed-point vector to float coordinates
 */
export function vec2FromFixed(vec: FixedVector2): { x: number; y: number } {
  return {
    x: fromFixed(vec.x),
    y: fromFixed(vec.y),
  };
}

/**
 * Adds two fixed-point vectors
 */
export function addVec2Fixed(a: FixedVector2, b: FixedVector2): FixedVector2 {
  return {
    x: addFixed(a.x, b.x),
    y: addFixed(a.y, b.y),
  };
}

/**
 * Subtracts two fixed-point vectors
 */
export function subVec2Fixed(a: FixedVector2, b: FixedVector2): FixedVector2 {
  return {
    x: subFixed(a.x, b.x),
    y: subFixed(a.y, b.y),
  };
}

/**
 * Scales a fixed-point vector by a fixed-point factor
 */
export function scaleVec2Fixed(vec: FixedVector2, scale: number): FixedVector2 {
  return {
    x: mulFixed(vec.x, scale),
    y: mulFixed(vec.y, scale),
  };
}

/**
 * Calculates magnitude of fixed-point vector
 */
export function magnitudeVec2Fixed(vec: FixedVector2): number {
  const x2 = mulFixed(vec.x, vec.x);
  const y2 = mulFixed(vec.y, vec.y);
  return sqrtFixed(addFixed(x2, y2));
}

/**
 * Normalizes a fixed-point vector (returns unit vector)
 */
export function normalizeVec2Fixed(vec: FixedVector2): FixedVector2 {
  const mag = magnitudeVec2Fixed(vec);
  if (mag === 0) {
    return { x: 0, y: 0 };
  }
  return {
    x: divFixed(vec.x, mag),
    y: divFixed(vec.y, mag),
  };
}