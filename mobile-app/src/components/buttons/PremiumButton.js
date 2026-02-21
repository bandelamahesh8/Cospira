import React, { useRef } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View, Animated, Easing } from 'react-native';
import { colors } from '../../core/theme/colors';
import LinearGradient from 'react-native-linear-gradient';
import { normalize } from '../../utils/responsive';
import Ionicons from 'react-native-vector-icons/Ionicons';
import HapticFeedback from 'react-native-haptic-feedback';
import { typography } from '../../core/theme/typography';
import { spacing } from '../../core/theme/spacing';
import { borderRadius } from '../../core/theme/borderRadius';
import { shadows } from '../../core/theme/shadows';

/**
 * Premium Button Component
 * Variants: primary (white on black), secondary (black on white), ghost, gradient
 */
const PremiumButton = ({
  title,
  onPress,
  style,
  // colors prop was shadowing imported colors and unused. Removing.
  icon,
  disabled = false,
  textStyle,
  iconPosition = 'left',
  fullWidth = false,
  size = 'md',
  variant = 'primary',
  loading = false,
  ...props
}) => {
  const handlePress = async () => {
    if (!disabled && !loading) {
      HapticFeedback.trigger('impactMedium');
      onPress?.();
    }
  };

  const getButtonStyle = () => {
    const baseStyle = [styles.button, styles[`button_${size}`]];
    
    if (fullWidth) baseStyle.push(styles.fullWidth);
    if (disabled) baseStyle.push(styles.disabled);
    
    switch (variant) {
      case 'primary':
        baseStyle.push(styles.primaryButton);
        break;
      case 'secondary':
        baseStyle.push(styles.secondaryButton);
        break;
      case 'ghost':
        baseStyle.push(styles.ghostButton);
        break;
      case 'gradient':
        baseStyle.push(styles.gradientButton);
        break;
      default:
        baseStyle.push(styles.primaryButton);
    }
    
    if (style) baseStyle.push(style);
    return baseStyle;
  };

  const getTextStyle = () => {
    const baseStyle = [styles.text, styles[`text_${size}`]];
    
    switch (variant) {
      case 'primary':
        baseStyle.push(styles.primaryText);
        break;
      case 'secondary':
        baseStyle.push(styles.secondaryText);
        break;
      case 'ghost':
        baseStyle.push(styles.ghostText);
        break;
      case 'gradient':
        baseStyle.push(styles.gradientText);
        break;
      default:
         baseStyle.push(styles.primaryText);
    }
    
    if (textStyle) baseStyle.push(textStyle);
    return baseStyle;
  };

  const renderIcon = () => {
    if (!icon) return null;
    const iconColor = variant === 'primary' || variant === 'gradient' ? '#ffffff' : '#000000';
    const iconSize = size === 'sm' ? 16 : size === 'lg' ? 24 : 20;
    
    return (
      <Ionicons 
        name={icon} 
        size={iconSize} 
        color={iconColor} 
        style={iconPosition === 'left' ? styles.iconLeft : styles.iconRight}
      />
    );
  };

  return (
    <TouchableOpacity
      style={getButtonStyle()}
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' || variant === 'gradient' ? '#ffffff' : '#000000'} />
      ) : (
        <View style={styles.content}>
          {iconPosition === 'left' && renderIcon()}
          <Text style={getTextStyle()}>{title}</Text>
          {iconPosition === 'right' && renderIcon()}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  button_sm: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 36,
  },
  button_md: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    minHeight: 48,
  },
  button_lg: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    minHeight: 56,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  
  // Variants
  primaryButton: {
    backgroundColor: '#000000',
    ...shadows.md,
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#000000',
  },
  ghostButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#000000',
  },
  gradientButton: {
    backgroundColor: '#6366f1',
    ...shadows.glow,
  },
  
  // Text Styles
  text: {
    fontWeight: '700',
    textAlign: 'center',
  },
  text_sm: {
    fontSize: 14,
  },
  text_md: {
    fontSize: 16,
  },
  text_lg: {
    fontSize: 18,
  },
  primaryText: {
    color: '#ffffff',
  },
  secondaryText: {
    color: '#000000',
  },
  ghostText: {
    color: '#000000',
  },
  gradientText: {
    color: '#ffffff',
  },
  
  // Icon Styles
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
});

export default PremiumButton;
