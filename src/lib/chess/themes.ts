/**
 * Chess Board Themes
 * Provides customizable board color schemes with localStorage persistence
 */

export const BOARD_THEMES = {
  classic: {
    name: 'Classic',
    lightSquare: '#f0d9b5',
    darkSquare: '#b58863',
    highlight: 'rgba(255, 255, 0, 0.4)',
  },
  modern: {
    name: 'Modern',
    lightSquare: '#e8eaed',
    darkSquare: '#4a5568',
    highlight: 'rgba(59, 130, 246, 0.4)',
  },
  ocean: {
    name: 'Ocean',
    lightSquare: '#e0f2fe',
    darkSquare: '#0c4a6e',
    highlight: 'rgba(6, 182, 212, 0.4)',
  },
  forest: {
    name: 'Forest',
    lightSquare: '#d1fae5',
    darkSquare: '#065f46',
    highlight: 'rgba(16, 185, 129, 0.4)',
  },
} as const;

export type ThemeName = keyof typeof BOARD_THEMES;

// LocalStorage key
const THEME_STORAGE_KEY = 'chess_board_theme';

/**
 * Save theme preference to localStorage
 */
export const saveTheme = (theme: ThemeName): void => {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (error) {
    console.warn('[Themes] Failed to save theme:', error);
  }
};

/**
 * Load theme preference from localStorage
 */
export const loadTheme = (): ThemeName => {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved && saved in BOARD_THEMES) {
      return saved as ThemeName;
    }
  } catch (error) {
    console.warn('[Themes] Failed to load theme:', error);
  }
  return 'classic';
};
