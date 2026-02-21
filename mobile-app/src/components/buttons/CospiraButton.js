import React, { useRef } from 'react';
import { TouchableWithoutFeedback, Text, StyleSheet, View, Animated } from 'react-native';
import { typography } from '../../core/theme/typography';

const CospiraButton = ({ 
  title, 
  onPress, 
  variant = 'primary', // primary, secondary, outline, ghost
  disabled = false,
  style,
  textStyle
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.96,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0.8,
        duration: 150,
        useNativeDriver: true,
      })
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      })
    ]).start();
  };

  const getBackgroundColor = () => {
    if (disabled) return '#cbd5e1';
    switch (variant) {
      case 'primary': return '#3b82f6'; // Professional Blue
      case 'secondary': return '#ffffff';
      case 'outline': return 'transparent';
      case 'ghost': return 'transparent';
      default: return '#3b82f6';
    }
  };

  const getTextColor = () => {
    if (disabled) return '#94a3b8';
    switch (variant) {
      case 'primary': return '#ffffff';
      case 'outline': return '#3b82f6';
      case 'ghost': return '#3b82f6';
      default: return '#1e293b';
    }
  };

  const getBorderStyle = () => {
    if (variant === 'outline') return { borderWidth: 1, borderColor: '#3b82f6' };
    if (variant === 'secondary') return { borderWidth: 1, borderColor: '#e2e8f0' };
    return {};
  };

  return (
    <TouchableWithoutFeedback
      onPress={onPress}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View
        style={[
          styles.container,
          { backgroundColor: getBackgroundColor() },
          getBorderStyle(),
          { 
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim 
          },
          style
        ]}
      >
        <Text style={[styles.text, { color: getTextColor() }, textStyle]}>
          {title}
        </Text>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: typography.fonts.body,
  }
});

export default CospiraButton;
