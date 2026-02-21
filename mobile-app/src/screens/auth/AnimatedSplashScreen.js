import React, { useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, Animated, Dimensions, StatusBar } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

const { width } = Dimensions.get('window');

const AnimatedSplashScreen = ({ onFinish }) => {
  const { colors, isDark } = useTheme();
  const [dots, setDots] = React.useState('.');
  const logoScale = useRef(new Animated.Value(0.9)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const connectingOpacity = useRef(new Animated.Value(0)).current;
  const containerOpacity = useRef(new Animated.Value(1)).current;

  console.log('[AnimatedSplashScreen] Mount, background:', colors.background, 'isDark:', isDark);
  // Dots animation
  useEffect(() => {
    const dotsInterval = setInterval(() => {
      setDots(prev => {
        if (prev === '.') return '..';
        if (prev === '..') return '...';
        return '.';
      });
    }, 500);
    return () => clearInterval(dotsInterval);
  }, []);

  useEffect(() => {
    // 1. Logo fades in and scales up slightly
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(logoScale, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Main Text "COSPIRA" fades in after a short delay
    Animated.timing(textOpacity, {
      toValue: 1,
      duration: 600,
      delay: 400,
      useNativeDriver: true,
    }).start();

    // 3. "Connecting..." subtext fades in last
    Animated.timing(connectingOpacity, {
      toValue: 0.5,
      duration: 600,
      delay: 800,
      useNativeDriver: true,
    }).start();

    // 4. Final fade out of the entire splash after 3 seconds
    const timer = setTimeout(() => {
      console.log('[AnimatedSplashScreen] Timer finished, fading out...');
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        console.log('[AnimatedSplashScreen] Fade out finished, calling onFinish');
        if (onFinish) onFinish();
      });
    }, 2800);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: containerOpacity, backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={styles.centerContent}>
        <Animated.Image 
          source={require('../../../assets/images/logo.png')} 
          style={[
            styles.logo, 
            { 
              opacity: logoOpacity,
              transform: [{ scale: logoScale }] 
            }
          ]} 
          resizeMode="contain"
        />
        
        <Animated.Text style={[styles.title, { opacity: textOpacity, color: colors.text }]}>
          COSPIRA
        </Animated.Text>
        
        <Animated.Text style={[styles.connecting, { opacity: connectingOpacity, color: colors.textSecondary }]}>
          Connecting{dots}
        </Animated.Text>
      </View>
    </Animated.View>
  );
};


const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  centerContent: {
    alignItems: 'center',
  },
  logo: {
    width: width * 0.4,
    height: width * 0.4,
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 10,
  },
  connecting: {
    fontSize: 16,
    fontWeight: '400',
  }
});

export default AnimatedSplashScreen;
