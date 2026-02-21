import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

const THEME_STORAGE_KEY = '@cospira_theme_mode';

/**
 * Theme Store
 * Manages app-wide theme preferences with persistence
 * Supports: light, dark, and system default modes
 */
export const useThemeStore = create((set, get) => ({
  // Theme mode: 'light' | 'dark' | 'system'
  themeMode: 'system',
  
  // Loading state for initial theme load
  isLoading: true,

  /**
   * Set theme mode and persist to storage
   */
  setThemeMode: async (mode) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
      set({ themeMode: mode });
      console.log('[ThemeStore] Theme mode set to:', mode);
    } catch (error) {
      console.error('[ThemeStore] Failed to save theme mode:', error);
    }
  },

  /**
   * Load theme mode from storage
   */
  loadThemeMode: async () => {
    try {
      const savedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedMode && ['light', 'dark', 'system'].includes(savedMode)) {
        set({ themeMode: savedMode, isLoading: false });
        console.log('[ThemeStore] Loaded theme mode:', savedMode);
      } else {
        set({ themeMode: 'system', isLoading: false });
        console.log('[ThemeStore] No saved theme, using system default');
      }
    } catch (error) {
      console.error('[ThemeStore] Failed to load theme mode:', error);
      set({ themeMode: 'system', isLoading: false });
    }
  },

  /**
   * Get active theme based on mode and system preference
   */
  getActiveTheme: (systemColorScheme) => {
    const { themeMode } = get();
    
    if (themeMode === 'system') {
      return systemColorScheme === 'dark' ? 'dark' : 'light';
    }
    
    return themeMode;
  },
}));

/**
 * Initialize theme store on app start
 */
export const initializeTheme = async () => {
  await useThemeStore.getState().loadThemeMode();
};

/**
 * Convenience hook for accessing theme store
 */
export const useTheme = () => {
  const systemColorScheme = useColorScheme();
  const { themeMode, setThemeMode, getActiveTheme, isLoading } = useThemeStore();
  
  const activeTheme = getActiveTheme(systemColorScheme);
  const isDark = activeTheme === 'dark';

  return {
    themeMode,
    activeTheme,
    isDark,
    setThemeMode,
    isLoading,
    systemColorScheme,
  };
};
