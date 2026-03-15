/**
 * Room Intelligence Service
 * Client-side service for AI-powered room features
 */

export type RoomMode = 'fun' | 'professional' | 'ultra' | 'mixed';

export interface RoomModeConfig {
  label: string;
  icon: string;
  description: string;
  securityLevel: 'low' | 'medium' | 'high'; // Moved to root
  features: {
    noiseSuppression: boolean;
    autoFraming: boolean;
    chat: boolean;
    games: boolean;
    virtualBrowser: boolean;
    screenShare: boolean;
    screenRecording: boolean;
    transcription: boolean;
    aiSummary: boolean;
    orpion: boolean;
    revealNames: boolean;
  };
  uiConfig: {
    theme: 'fun' | 'professional' | 'ultra' | 'mixed';
    layout: string;
    showTimer?: boolean;
    gameOverlay?: boolean;
    securityHud?: boolean;
    watermark?: boolean;
    screenCapturePrevention?: boolean;
  };
}

export interface RoomSuggestion {
  suggestedMode: RoomMode;
  confidence: number;
  reason: string;
}

// Room mode configurations (matches server-side)
export const ROOM_MODE_CONFIGS: Record<RoomMode, RoomModeConfig> = {
  fun: {
    label: 'Fun Mode',
    icon: '🎮',
    description: 'Entertainment & casual socializing. No restrictions.',
    securityLevel: 'low',
    features: {
      noiseSuppression: false,
      autoFraming: false,
      chat: true,
      games: true,
      virtualBrowser: true,
      screenShare: true,
      screenRecording: true,
      transcription: false,
      aiSummary: false, // User Requirement: No AI Summary in Fun
      orpion: false, // User Requirement: No Orpion in Fun
      revealNames: true,
    },
    uiConfig: {
      theme: 'fun',
      layout: 'dynamic',
      gameOverlay: true,
    },
  },
  professional: {
    label: 'Professional',
    icon: '💼',
    description: 'Distraction-free workspace with AI minutes. No games.',
    securityLevel: 'medium',
    features: {
      noiseSuppression: true,
      autoFraming: true,
      chat: true,
      games: false, // User Requirement: No games in Professional
      virtualBrowser: true,
      screenShare: true,
      screenRecording: true,
      transcription: true,
      aiSummary: true,
      orpion: true,
      revealNames: true,
    },
    uiConfig: {
      theme: 'professional',
      layout: 'grid',
      showTimer: true,
    },
  },
  ultra: {
    label: 'Ultra Security',
    icon: '🔐',
    description: 'Highly professional, audited. No screenshots/recording. Mandatory PIN.',
    securityLevel: 'high',
    features: {
      noiseSuppression: true,
      autoFraming: false,
      chat: true,
      games: false,
      virtualBrowser: true, 
      screenShare: true, 
      screenRecording: false, // NO recording allowed
      transcription: true,
      aiSummary: false, // User Requirement: No AI tools
      orpion: false, // User Requirement: No Orpion
      revealNames: false, // Blind to participants
    },
    uiConfig: {
      theme: 'ultra',
      layout: 'focused',
      securityHud: true,
      watermark: true,
      screenCapturePrevention: true, // Advanced CSS Deterrents
    },
  },
  mixed: {
    label: 'Mixed Mode',
    icon: '⚡',
    description: 'Power user capabilities. Everything unlocked.',
    securityLevel: 'medium',
    features: {
      noiseSuppression: true,
      autoFraming: true,
      chat: true,
      games: true,
      virtualBrowser: true,
      screenShare: true,
      screenRecording: true,
      transcription: true,
      aiSummary: true,
      orpion: true,
      revealNames: true,
    },
    uiConfig: {
      theme: 'mixed',
      layout: 'dynamic',
      showTimer: true,
    },
  },
};

/**
 * Get configuration for a specific room mode
 */
export function getModeConfig(mode: RoomMode): RoomModeConfig {
  return ROOM_MODE_CONFIGS[mode] || ROOM_MODE_CONFIGS.mixed;
}

/**
 * Get all available room modes
 */
export function getAllModes(): RoomMode[] {
  return Object.keys(ROOM_MODE_CONFIGS) as RoomMode[];
}

/**
 * Check if a feature is enabled for a given mode
 */
export function isFeatureEnabled(
  mode: RoomMode,
  feature: keyof RoomModeConfig['features']
): boolean {
  const config = getModeConfig(mode);
  return config.features[feature] ?? false;
}

/**
 * Get UI configuration for a mode
 */
export function getUIConfig(mode: RoomMode): RoomModeConfig['uiConfig'] {
  const config = getModeConfig(mode);
  return config.uiConfig;
}

/**
 * Normalize variations of room modes into canonical RoomMode
 */
export function normalizeRoomMode(mode: string | null | undefined): RoomMode {
  if (!mode) return 'mixed';
  const m = String(mode).toLowerCase().trim();
  if (m === 'fun') return 'fun';
  if (m === 'prof' || m === 'pro' || m === 'professional') return 'professional';
  if (m === 'ultra_secure' || m === 'ultra') return 'ultra';
  if (m === 'mixed') return 'mixed';
  return 'mixed';
}

export default {
  getModeConfig,
  normalizeRoomMode,
  getAllModes,
  isFeatureEnabled,
  getUIConfig,
  ROOM_MODE_CONFIGS,
};
