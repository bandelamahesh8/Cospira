/**
 * Cross-Game Consistency
 * Shared messages and patterns across Chess and Ludo
 */

// Shared system messages
export const GAME_MESSAGES = {
  YOUR_TURN: 'Your Turn',
  WAITING: 'Waiting for opponent...',
  GAME_OVER: 'Game Over',
  CONNECTING: 'Connecting...',
  RECONNECTING: 'Reconnecting...',
  CONNECTION_LOST: 'Connection Lost',
  OPPONENT_LEFT: 'Opponent Left',
} as const;

// Shared animation easing (scaled for each game)
export const ANIMATION_EASING = {
  SMOOTH: 'easeInOut',
  BOUNCE: 'easeOut',
  SNAP: 'easeIn',
} as const;

// Shared haptic patterns
export const HAPTIC_PATTERNS = {
  LIGHT: 10,
  MEDIUM: 20,
  HEAVY: 50,
  SUCCESS: [50, 30, 50],
  ERROR: [30, 50, 30, 50],
} as const;

// Shared color palette
export const SHARED_COLORS = {
  SUCCESS: '#22c55e',
  ERROR: '#ef4444',
  WARNING: '#f59e0b',
  INFO: '#3b82f6',
} as const;
