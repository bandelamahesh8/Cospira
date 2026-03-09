/**
 * Ludo Game Configuration
 * Central control for all Ludo features, animations, and device optimizations
 */

export const LUDO_CONFIG = {
  // Feature Toggles
  FEATURES: {
    // Emotion Engineering
    LUCK_TRANSPARENCY: true,
    DICE_OWNERSHIP: true,
    TOKEN_PERSONALITY: true,
    KILL_SLOWMO: true,

    // Performance
    CHAIN_EVENT_COMPRESSION: true,
    ENDGAME_ACCELERATION: true,
    LOW_END_MODE: false, // Auto-detect based on device

    // UX
    INTENT_HIGHLIGHTING: true,
    ANTI_STALL_PROTECTION: true,
    TOUCH_FORGIVENESS: true,
    RAGE_EXIT_INTERCEPTOR: true,
    SPECTATOR_ENERGY: true,

    // Session
    SESSION_MEMORY: true,
    FAIR_LOSS_FRAMING: true,
  },

  // Animation Budget (STRICT LIMITS)
  ANIMATION: {
    MAX_MAJOR_ANIMATIONS: 1,
    MAX_MICRO_EFFECTS: 2,

    // Priority Levels (higher = more important)
    PRIORITY_LEVELS: {
      KILL: 100,
      SIX: 80,
      DICE_ROLL: 60,
      TOKEN_MOVE: 40,
      UI_GLOW: 20,
    },

    // Chain Event Compression
    COMPRESSION: {
      SECOND_SIX_SPEEDUP: 0.2, // 20% faster
      THIRD_CHAIN_SPEEDUP: 0.4, // 40% faster
      THIRD_CHAIN_SKIP_MICRO: true,
    },

    // Durations
    DICE_ROLL_MS: 800,
    TOKEN_MOVE_MS: 400,
    KILL_SLOWMO_MS: 300,
    SIX_CELEBRATION_MS: 500,
  },

  // Emotion Engineering
  EMOTION: {
    INTENSITY: 'MED' as 'LOW' | 'MED' | 'HIGH',
    KILL_SLOWMO_MS: 300,
    COOLDOWN_AFTER_SPIKE_MS: 150,
    DICE_ANTICIPATION_MS: 800,
    TOKEN_WIGGLE_BEFORE_KILL: true,
    TOKEN_BOUNCE_ON_SIX: true,
  },

  // Device Optimization
  DEVICE: {
    LOW_END_THRESHOLD_RAM_MB: 3000,
    DISABLE_SHADOWS_ON_LOW_END: true,
    DISABLE_BLUR_ON_LOW_END: true,
    DISABLE_PARTICLES_ON_LOW_END: true,
    LARGER_HITBOX_MULTIPLIER: 1.5,
    TOUCH_FORGIVENESS_RADIUS_PX: 20,
  },

  // Anti-Stall
  STALL: {
    PULSE_AFTER_MS: 5000,
    COUNTDOWN_AFTER_MS: 10000,
    MAX_TURN_TIME_MS: 15000,
  },

  // Visual Thresholds
  VISUAL: {
    KILL_GLOW_INTENSITY: 0.8,
    SAFE_GLOW_INTENSITY: 0.5,
    NORMAL_GLOW_INTENSITY: 0.3,
  },
} as const;

export type LudoConfig = typeof LUDO_CONFIG;

/**
 * Detect if device is low-end
 */
export const isLowEndDevice = (): boolean => {
  if (typeof navigator === 'undefined') return false;

  // Check device memory (if available)
  interface NavigatorWithMemory extends Navigator {
    deviceMemory?: number;
  }
  const deviceMemory = (navigator as NavigatorWithMemory).deviceMemory;
  if (deviceMemory && deviceMemory < LUDO_CONFIG.DEVICE.LOW_END_THRESHOLD_RAM_MB / 1024) {
    return true;
  }

  // Check hardware concurrency (CPU cores)
  if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) {
    return true;
  }

  return false;
};
