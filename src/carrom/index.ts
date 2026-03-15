/**
 * Carrom Game Module
 *
 * Complete multiplayer carrom board game implementation
 * for the Cospira collaboration platform.
 */

// Core types
export * from './types/game-state';

// Fixed-point arithmetic
export * from './fixed-point';

// Physics engine
export * from './physics/matter-engine';

// State creation utilities
export * from './utils/game-state-creator';

// Game engine
export * from './engine/game-engine';

// React components
export * from './components/CarromGame';

// Constants
export const CARROM_CONSTANTS = {
  GAME_DURATION_SECONDS: 120,
  MAX_DRAG_DISTANCE: 3,
  MIN_DRAG_DISTANCE: 0.1,
  DRAG_FORCE_MULTIPLIER: 5,
  TURN_SWITCH_DELAY: 2,
  POINTS: {
    WHITE: 1,
    BLACK: 1,
    QUEEN: 2,
    STRIKER: -1,
  },
} as const;