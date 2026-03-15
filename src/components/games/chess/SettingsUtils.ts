export interface FeatureToggles {
  sounds: boolean;
  blunderWarnings: boolean;
  focusMode: boolean;
  antiRage: boolean;
}

export const SETTINGS_STORAGE_KEY = 'chess_settings';

export const DEFAULT_SETTINGS: FeatureToggles = {
  sounds: true,
  blunderWarnings: false,
  focusMode: true,
  antiRage: true,
};

export const loadSettings = (): FeatureToggles => {
  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
  } catch (error) {
    console.warn('[Settings] Failed to load settings:', error);
    return DEFAULT_SETTINGS;
  }
};

// Preset time controls
export const TIME_CONTROLS = {
  bullet: { time: 60, increment: 0, name: 'Bullet (1+0)' },
  blitz: { time: 180, increment: 2, name: 'Blitz (3+2)' },
  rapid: { time: 600, increment: 0, name: 'Rapid (10+0)' },
  classical: { time: 1800, increment: 0, name: 'Classical (30+0)' },
} as const;

export type TimeControlPreset = keyof typeof TIME_CONTROLS;
