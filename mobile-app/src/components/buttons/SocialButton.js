import React, { useRef } from 'react';
import { TouchableWithoutFeedback, StyleSheet, Animated, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const SocialButton = ({ type, onPress, style }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.94,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const getIcon = () => {
    switch (type) {
      case 'google':
        return <MaterialCommunityIcons name="google" size={24} color="#EA4335" />;
      case 'facebook':
        return <MaterialCommunityIcons name="facebook" size={24} color="#1877F2" />;
      case 'apple':
        return <MaterialCommunityIcons name="apple" size={24} color="#000000" />;
      default:
        return null;
    }
  };

  return (
    <TouchableWithoutFeedback 
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View style={[
        styles.container, 
        { transform: [{ scale: scaleAnim }] },
        style
      ]}>
        <View style={styles.iconContainer}>
          {getIcon()}
        </View>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    height: 56,
    width: '48%',
    alignItems: 'center',
    justifyContent: 'center',
    // iOS Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    // Android elevation
    elevation: 2,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  }
});

export default SocialButton;
