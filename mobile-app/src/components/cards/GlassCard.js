import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { colors } from '../../core/theme/colors';
import { borderRadius } from '../../core/theme/borderRadius';
import { shadows } from '../../core/theme/shadows';

/**
 * Premium Glassmorphism Card Component
 * Creates glass effect with blur and transparency
 */
const GlassCard = ({ 
  children, 
  style, 
  variant = 'dark',
  intensity = 50,
  useBlur = Platform.OS !== 'web', // BlurView works better on native
}) => {
  // Filter out whitespace-only text nodes
  const cleanChildren = React.Children.toArray(children).filter(child => {
    if (typeof child === 'string' && !child.trim()) return false;
    return true;
  });

  const glassStyle = variant === 'dark' 
    ? styles.glassDark 
    : styles.glassLight;

  if (useBlur) {
    return (
      <View style={[styles.container, style]}>
        <BlurView 
          intensity={intensity} 
          tint={variant === 'dark' ? 'dark' : 'light'}
          style={styles.blur}
        >
          <View style={[styles.content, glassStyle]}>
            {cleanChildren}
          </View>
        </BlurView>
      </View>
    );
  }

  // Fallback for web or when blur is disabled
  return (
    <View style={[styles.container, styles.content, glassStyle, style]}>
      {cleanChildren}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  blur: {
    flex: 1,
  },
  content: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    padding: 16,
    ...shadows.md,
  },
  glassLight: {
    backgroundColor: colors.glass?.light || 'rgba(255, 255, 255, 0.7)',
    borderColor: colors.glass?.lightBorder || 'rgba(255, 255, 255, 0.3)',
  },
  glassDark: {
    backgroundColor: colors.glass?.dark || 'rgba(18, 18, 18, 0.85)',
    borderColor: colors.glass?.darkBorder || 'rgba(255, 255, 255, 0.1)',
  },
});

export default GlassCard;
