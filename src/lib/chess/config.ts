/**
 * Chess Game Configuration
 * Central configuration for all chess features, performance budgets, and feature flags
 */

export const CHESS_CONFIG = {
  // Feature Flags - Can be toggled to enable/disable features
  FEATURES: {
    WAITING_ANIMATION: true,
    TIME_PRESSURE_UI: true,
    SYNC_INDICATORS: true,
    TURN_PULSE_ANIMATION: true,
    BOARD_INTERACTION_FEEDBACK: true, // Phase 2 - ENABLED
    CAMERA_DEPTH: false, // Phase 2 - Limited by react-chessboard
    SOUND_HAPTICS: true, // Phase 2 - ENABLED
    PLAYER_PRESENCE: true, // Phase 3 - ENABLED
    COGNITIVE_LOAD_CONTROL: true, // Phase 3 - ENABLED
    ANTI_FATIGUE: true, // Phase 3 - ENABLED
    ANTI_RAGE: true, // Phase 3 - ENABLED
    MOVE_PREDICTION: false, // Phase 4 - Complex, defer
    ERROR_PREVENTION: true, // Phase 4 - ENABLED
    REPLAY_READY: true, // Phase 4 - ENABLED
    CUSTOMIZATION: true, // Phase 5 - ENABLED
    FOCUS_MODE: true, // Phase 5 - ENABLED (user toggle)
    SESSION_HISTORY: true, // Phase 5 - ENABLED
    PERSISTENT_THEMES: true, // Phase 5 - ENABLED
  },

  // Performance Budgets
  PERFORMANCE: {
    MAX_CONCURRENT_ANIMATIONS: 3,
    MAX_FRAME_TIME_MS: 16, // 60fps = 16.67ms per frame
    CRITICAL_FRAME_TIME_MS: 20,
    MAX_ANIMATION_DURATION_MS: 200,
    PRELOAD_ASSETS: true,
    ENABLE_PERFORMANCE_MONITORING: true,
  },

  // Timer Configuration
  TIMERS: {
    DEFAULT_TURN_TIME: 60, // seconds
    WARNING_THRESHOLD: 10, // Amber color
    CRITICAL_THRESHOLD: 5, // Red color with pulse
  },

  // Animation Timings
  ANIMATIONS: {
    PIECE_LIFT_DURATION: 150,
    MOVE_DURATION: 200,
    TURN_PULSE_DURATION: 300,
    WAITING_PIECE_CYCLE: 2000, // Pawn → Knight → Queen cycle
    STATUS_TEXT_ROTATION: 3000,
  },

  // Visual Thresholds
  VISUAL: {
    TIME_PRESSURE_COLORS: {
      NORMAL: 'text-emerald-500',
      WARNING: 'text-amber-500',
      CRITICAL: 'text-red-500',
    },
    SYNC_INDICATOR_DURATION: 1500, // How long to show sync indicator
    FATIGUE_THRESHOLD_MINUTES: 15, // Phase 3
    REDUCED_CONTRAST_OPACITY: 0.85, // Phase 3
  },

  // Waiting State Messages
  WAITING_MESSAGES: [
    'Searching for opponent...',
    'Preparing the board...',
    'Finding a worthy challenger...',
    'Setting up pieces...',
    'Almost ready...',
  ],
} as const;

export type ChessConfig = typeof CHESS_CONFIG;
