import React, { useRef } from 'react';
import { TextInput, Animated, StyleSheet, View } from 'react-native';
import { typography } from '../../core/theme/typography';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../hooks/useTheme';

const CospiraInput = ({ 
  placeholder, 
  value, 
  onChangeText, 
  leftIcon, 
  rightElement, 
  style, 
  secureTextEntry,
  autoCapitalize = 'none',
  containerStyle
}) => {
  const { colors } = useTheme();
  const focusAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = () => {
    Animated.timing(focusAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const handleBlur = () => {
    Animated.timing(focusAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const borderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#e2e8f0', '#3b82f6'] // slate-200 to blue-500
  });

  const borderWidth = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2]
  });

  return (
    <Animated.View 
      style={[
        styles.container, 
        { borderColor, borderWidth, backgroundColor: colors.surface },
        containerStyle,
        style
      ]}
    >
      {leftIcon && (
        <MaterialCommunityIcons 
          name={leftIcon} 
          size={20} 
          color="#94a3b8" 
          style={styles.leftIcon} 
        />
      )}
      <TextInput
        style={[styles.input, { color: colors.text }]}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
      {rightElement && (
        <View style={styles.rightElement}>
          {rightElement}
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  leftIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: typography.fonts.body,
    height: '100%',
  },
  rightElement: {
    marginLeft: 8,
  }
});

export default CospiraInput;
