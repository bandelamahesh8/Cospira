/**
 * This UI is intentionally minimal.
 * Do not add features unless something else is removed.
 *
 * XO Configuration
 * Philosophy: Silence Under Pressure
 */

export const XO_CONFIG = {
  // Timing (Fixed, Predictable - muscle memory)
  TIMING: {
    SYMBOL_DRAW_MS: 120, // X and O draw time
    WIN_LINE_MS: 150, // Strike-through
    BOARD_RESET_MS: 180, // Clean fade
    SILENCE_AFTER_WIN_MS: 300, // Let moment land
    END_SESSION_PAUSE_MS: 100, // Neutral reset
  },

  // Visual (No shadows, no blur, no gradients)
  VISUAL: {
    USE_SVG: true, // Vector only
    NO_SHADOWS: true,
    NO_BLUR: true,
    NO_GRADIENTS: true,
    FIXED_LAYOUT: true,
    THICK_GRID_LINES: true,
    HIGH_CONTRAST: true,
  },

  // Noise Budget (STRICT)
  NOISE_BUDGET: {
    MAX_SOUNDS_PER_EVENT: 1,
    MAX_ANIMATIONS_PER_EVENT: 1,
    MAX_STATE_CHANGES_PER_TURN: 1,
  },

  // Sound (Bare minimum)
  SOUND: {
    MOVE_VOLUME: 0.1,
    WIN_VOLUME: 0.15,
    MAX_VOLUME: 0.2, // Never loud
  },

  // Anti-Overdesign Lock
  DESIGN_LOCK: {
    ENFORCE_REMOVAL_ON_ADD: true,
    MAX_UI_ELEMENTS: 10, // Board + symbols + minimal UI
  },
} as const;

export type XOConfig = typeof XO_CONFIG;
