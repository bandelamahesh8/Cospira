/**
 * Chess Game Configuration - Mobile
 * Central configuration for all chess features on mobile
 */

export const CHESS_CONFIG = {
  // Feature Flags
  FEATURES: {
    WAITING_ANIMATION: true,
    TIME_PRESSURE_UI: true,
    SYNC_INDICATORS: true,
    TURN_PULSE_ANIMATION: true,
    BOARD_INTERACTION_FEEDBACK: false, // Phase 2
    SOUND_HAPTICS: false, // Phase 2
    PLAYER_PRESENCE: false, // Phase 3
    COGNITIVE_LOAD_CONTROL: false, // Phase 3
    ANTI_FATIGUE: false, // Phase 3
    ANTI_RAGE: false, // Phase 3
    CUSTOMIZATION: false, // Phase 5
  },

  // Performance Budgets
  PERFORMANCE: {
    MAX_CONCURRENT_ANIMATIONS: 3,
    USE_NATIVE_DRIVER: true, // Always use native driver for 60fps
    ENABLE_PERFORMANCE_MONITORING: true,
  },

  // Timer Configuration
  TIMERS: {
    DEFAULT_TURN_TIME: 60,
    WARNING_THRESHOLD: 10,
    CRITICAL_THRESHOLD: 5,
  },

  // Animation Timings
  ANIMATIONS: {
    PIECE_LIFT_DURATION: 150,
    MOVE_DURATION: 200,
    TURN_PULSE_DURATION: 300,
    WAITING_PIECE_BOUNCE: 1000,
    STATUS_TEXT_ROTATION: 3000,
  },

  // Visual Thresholds
  VISUAL: {
    TIME_PRESSURE_COLORS: {
      NORMAL: '#10b981', // emerald-500
      WARNING: '#f59e0b', // amber-500
      CRITICAL: '#ef4444', // red-500
    },
    SYNC_INDICATOR_DURATION: 1500,
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
