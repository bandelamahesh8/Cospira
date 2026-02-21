
export const SNAKELADDER_CONFIG = {
  // Feature Toggles
  FEATURES: {
    FATE_FRAMING: true,
    FORESHADOWING: true,
    BREATHING_ROOM: true,
    AMBIENT_LIFE: true,
    EMOTIONAL_RESET: true,
    COMFORT_SCALING: true,
  },
  
  // Timing (Gentle, Patient)
  TIMING: {
    DICE_ROLL_MS: 800, // Slower than Ludo
    DICE_REVEAL_PAUSE_MS: 100, // Brief suspense
    TOKEN_STEP_MS: 120, // Deliberate pace
    STEP_PAUSE_MS: 50, // Slight pause on each square
    LADDER_CLIMB_MS: 1200, // Slow, uplifting
    SNAKE_SLIDE_MS: 1500, // Slowest, let them feel it
    BREATHING_ROOM_MS: 200, // After major events
    TURN_TRANSITION_MS: 300, // Clean slate
  },
  
  // Emotion Engineering (Soft, Kind)
  EMOTION: {
    INTENSITY: 'GENTLE' as 'GENTLE' | 'SOFT' | 'CALM',
    LADDER_GLOW_INTENSITY: 0.4,
    SNAKE_WARNING_INTENSITY: 0.5,
    AMBIENT_MOTION_INTERVAL_MS: 8000, // Snakes breathe every 8s
    LADDER_SHIMMER_INTERVAL_MS: 10000, // Ladders shimmer every 10s
  },
  
  // Sound (Storybook Tone - NO SHARP SOUNDS)
  SOUND: {
    DICE_VOLUME: 0.15, // Soft
    LADDER_VOLUME: 0.2, // Gentle positive
    SNAKE_VOLUME: 0.15, // Low, gentle
    WIN_VOLUME: 0.25, // Calm celebration
    MAX_VOLUME: 0.3, // Never loud
  },
  
  // Visual (Soft, Readable)
  VISUAL: {
    SNAKE_HEAD_SCALE: 1.3, // Larger than body
    LADDER_TOP_GLOW: true,
    TURN_HALO_OPACITY: 0.4, // Soft, not bright
    BOARD_FADE_ON_EVENT: 0.8, // Dim others during event
  },
  
  // Comfort Features
  COMFORT: {
    NIGHT_MODE_AUTO: true,
    NIGHT_CONTRAST_REDUCTION: 0.7,
    LARGE_HITBOX_MULTIPLIER: 1.4,
    ZOOM_OUT_AFTER_FALL: true,
    COLOR_SOFTEN_AFTER_FALL: true,
  },
} as const;

export type SnakeLadderConfig = typeof SNAKELADDER_CONFIG;

/**
 * Check if it's nighttime (softer visuals)
 */
export const isNightTime = (): boolean => {
  const hour = new Date().getHours();
  return hour >= 20 || hour < 7; // 8 PM - 7 AM
};
