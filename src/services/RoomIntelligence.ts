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
    transcription: boolean;
    summary: boolean;
  };
  uiConfig: {
    theme: 'fun' | 'professional' | 'ultra' | 'mixed';
    layout: string;
    showTimer?: boolean;
    gameOverlay?: boolean;
    securityHud?: boolean;
    watermark?: boolean;
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
      transcription: false,
      summary: false, // User Requirement: No need for summary in Fun
    },
    uiConfig: {
      theme: 'fun',
      layout: 'dynamic',
      gameOverlay: true
    }
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
      transcription: true,
      summary: true,
    },
    uiConfig: {
      theme: 'professional',
      layout: 'grid',
      showTimer: true
    }
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
      games: false, // Professional standard
      virtualBrowser: false, // Limit external vectors
      screenShare: false, // User Req: No outgoing screen share
      transcription: true, 
      summary: true, // "Complete high professional" implies minutes needed.
    },
    uiConfig: {
      theme: 'ultra',
      layout: 'focused',
      securityHud: true,
      watermark: true
    }
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
      transcription: true,
      summary: true,
    },
    uiConfig: {
      theme: 'mixed',
      layout: 'dynamic',
      showTimer: true
    }
  }
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
export function isFeatureEnabled(mode: RoomMode, feature: keyof RoomModeConfig['features']): boolean {
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

export default {
  getModeConfig,
  getAllModes,
  isFeatureEnabled,
  getUIConfig,
  ROOM_MODE_CONFIGS
};
