import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { colors } from '../../core/theme/colors';
import { typography } from '../../core/theme/typography';
import { spacing } from '../../core/theme/spacing';
import { borderRadius } from '../../core/theme/borderRadius';
import { animation } from '../../core/theme/animation';

/**
 * Premium Input Component
 * Glass morphism text input with floating label and icon support
 */
const PremiumInput = ({
  label,
  value,
  onChangeText,
  icon,
  rightIcon,
  onRightIconPress,
  variant = 'dark',
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  error = null,
  style,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const labelAnim = React.useRef(new Animated.Value(value ? 1 : 0)).current;

  React.useEffect(() => {
    Animated.timing(labelAnim, {
      toValue: isFocused || value ? 1 : 0,
      duration: animation.fast,
      useNativeDriver: false,
    }).start();
  }, [isFocused, value]);

  const labelStyle = {
    top: labelAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [18, -8],
    }),
    fontSize: labelAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [16, 12],
    }),
  };

  const containerStyle = variant === 'dark' 
    ? styles.containerDark 
    : styles.containerLight;

  const textColor = variant === 'dark' 
    ? colors.dark.text 
    : colors.light.text;

  const borderColor = error 
    ? colors.danger 
    : isFocused 
      ? colors.primary 
      : variant === 'dark' 
        ? colors.dark.border 
        : colors.light.border;

  return (
    <View style={[styles.wrapper, style]}>
      <View style={[styles.container, containerStyle, { borderColor }]}>
        {icon && (
          <Ionicons 
            name={icon} 
            size={20} 
            color={isFocused ? colors.primary : colors.dark.textSecondary}
            style={styles.icon}
          />
        )}
        
        <View style={styles.inputWrapper}>
          <Animated.Text style={[styles.label, { color: textColor }, labelStyle]}>
            {label}
          </Animated.Text>
          
          <TextInput
            value={value}
            onChangeText={onChangeText}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            secureTextEntry={secureTextEntry}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            style={[styles.input, { color: textColor }]}
            placeholderTextColor={colors.dark.textSecondary}
            {...props}
          />
        </View>

        {rightIcon && (
          <TouchableOpacity onPress={onRightIconPress} activeOpacity={0.7} style={styles.rightIcon}>
            <Ionicons 
              name={rightIcon} 
              size={20} 
              color={isFocused ? colors.primary : colors.dark.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>
      
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    paddingHorizontal: 16,
    paddingVertical: spacing.sm,
    minHeight: 56,
    position: 'relative',
  },
  containerDark: {
    backgroundColor: colors.glass?.dark || 'rgba(10, 10, 10, 0.7)',
  },
  containerLight: {
    backgroundColor: colors.glass?.light || 'rgba(255, 255, 255, 0.7)',
  },
  icon: {
    marginRight: spacing.sm,
  },
  rightIcon: {
    marginLeft: spacing.sm,
  },
  inputWrapper: {
    flex: 1,
    position: 'relative',
  },
  label: {
    position: 'absolute',
    left: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 4,
    fontWeight: '500',
  },
  input: {
    fontSize: typography.sizes.md,
    paddingTop: 8,
    paddingBottom: 0,
    height: 40,
  },
  errorText: {
    color: colors.danger,
    fontSize: typography.sizes.sm,
    marginTop: spacing.xs,
    marginLeft: spacing.sm,
  },
});

export default PremiumInput;
