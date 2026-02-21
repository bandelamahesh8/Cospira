import { useColorScheme } from 'react-native';
import { useThemeStore } from '../store/themeStore';
import { colors as themeColors } from '../core/theme/colors';

/**
 * Custom hook for accessing theme colors and state
 * Automatically switches between light/dark based on user preference
 * 
 * @returns {Object} Theme object with colors and state
 */
export const useTheme = () => {
  const systemColorScheme = useColorScheme();
  const { themeMode, setThemeMode, getActiveTheme, isLoading } = useThemeStore();
  
  // Determine active theme
  const activeTheme = getActiveTheme(systemColorScheme);
  const isDark = activeTheme === 'dark';
  
  // Get theme-specific colors
  const colors = {
    // Dynamic colors based on theme
    ...themeColors[activeTheme],
    
    // Brand colors (always the same)
    primary: themeColors.primary,
    primaryDim: themeColors.primaryDim,
    secondary: themeColors.secondary,
    secondaryDim: themeColors.secondaryDim,
    
    // Accent colors
    accent: themeColors.accent,
    
    // Functional colors
    success: themeColors.success,
    warning: themeColors.warning,
    danger: themeColors.danger,
    info: themeColors.info,
    
    // Glass effects
    glass: themeColors.glass,
    
    // Legacy colors for backward compatibility
    ...themeColors,
  };

  return {
    // Current colors
    colors,
    
    // Theme state
    themeMode,        // 'light' | 'dark' | 'system'
    activeTheme,      // 'light' | 'dark' (resolved)
    isDark,           // boolean
    isLight: !isDark, // boolean
    
    // Actions
    setThemeMode,
    
    // Loading state
    isLoading,
    
    // System info
    systemColorScheme,
  };
};
