/**
 * Ludo Customization System
 * Features: Dice skins, board themes with localStorage
 */

export const DICE_SKINS = {
  classic: {
    name: 'Classic',
    color: '#ffffff',
    style: 'solid',
    shadow: '0 4px 12px rgba(0,0,0,0.3)',
  },
  glass: {
    name: 'Glass',
    color: 'rgba(255,255,255,0.3)',
    style: 'glass',
    shadow: '0 4px 20px rgba(255,255,255,0.5)',
    backdropFilter: 'blur(10px)',
  },
  neon: {
    name: 'Neon',
    color: '#00ff00',
    style: 'glow',
    shadow: '0 0 30px #00ff00',
  },
  gold: {
    name: 'Gold',
    color: '#ffd700',
    style: 'metallic',
    shadow: '0 4px 20px rgba(255,215,0,0.6)',
  },
} as const;

export const BOARD_THEMES = {
  minimal: {
    name: 'Minimal',
    background: '#1a1a1a',
    accent: '#333333',
    pathColor: '#2a2a2a',
  },
  festive: {
    name: 'Festive',
    background: '#ff6b6b',
    accent: '#ffd93d',
    pathColor: '#ff8787',
  },
  classic: {
    name: 'Classic',
    background: '#f0f0f0',
    accent: '#333333',
    pathColor: '#ffffff',
  },
  ocean: {
    name: 'Ocean',
    background: '#0c4a6e',
    accent: '#0ea5e9',
    pathColor: '#075985',
  },
} as const;

export type DiceSkin = keyof typeof DICE_SKINS;
export type BoardTheme = keyof typeof BOARD_THEMES;

const DICE_SKIN_KEY = 'ludo_dice_skin';
const BOARD_THEME_KEY = 'ludo_board_theme';

/**
 * Save dice skin preference
 */
export const saveDiceSkin = (skin: DiceSkin): void => {
  try {
    localStorage.setItem(DICE_SKIN_KEY, skin);
  } catch (error) {
    console.warn('[Ludo Customization] Failed to save dice skin:', error);
  }
};

/**
 * Load dice skin preference
 */
export const loadDiceSkin = (): DiceSkin => {
  try {
    const saved = localStorage.getItem(DICE_SKIN_KEY);
    if (saved && saved in DICE_SKINS) {
      return saved as DiceSkin;
    }
  } catch (error) {
    console.warn('[Ludo Customization] Failed to load dice skin:', error);
  }
  return 'classic';
};

/**
 * Save board theme preference
 */
export const saveBoardTheme = (theme: BoardTheme): void => {
  try {
    localStorage.setItem(BOARD_THEME_KEY, theme);
  } catch (error) {
    console.warn('[Ludo Customization] Failed to save board theme:', error);
  }
};

/**
 * Load board theme preference
 */
export const loadBoardTheme = (): BoardTheme => {
  try {
    const saved = localStorage.getItem(BOARD_THEME_KEY);
    if (saved && saved in BOARD_THEMES) {
      return saved as BoardTheme;
    }
  } catch (error) {
    console.warn('[Ludo Customization] Failed to load board theme:', error);
  }
  return 'classic';
};
