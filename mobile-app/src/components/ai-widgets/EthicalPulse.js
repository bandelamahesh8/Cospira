import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors } from '../../core/theme/colors';
import { typography } from '../../core/theme/typography';
import { spacing } from '../../core/theme/spacing';
import GlassCard from '../cards/GlassCard';

const EthicalPulse = ({ score, status }) => {
  const animatedValue = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulseSpeed = score > 80 ? 1500 : score > 50 ? 800 : 400;
    
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1.2,
          duration: pulseSpeed,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: pulseSpeed,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [score]);

  const getStatusColor = () => {
    if (score > 80) return colors.success;
    if (score > 50) return colors.warning;
    return colors.danger;
  };

  const color = getStatusColor();

  return (
    <GlassCard style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.label}>ETHICAL ALIGNMENT PULSE</Text>
        <Text style={[styles.status, { color }]}>{status}</Text>
      </View>
      
      <View style={styles.pulseContainer}>
        <Animated.View 
          style={[
            styles.pulseCircle, 
            { 
              borderColor: color,
              transform: [{ scale: animatedValue }],
              opacity: animatedValue.interpolate({
                inputRange: [1, 1.2],
                outputRange: [0.8, 0.2]
              })
            }
          ]} 
        />
        <View style={[styles.core, { backgroundColor: color }]} />
        <Text style={styles.scoreText}>{score}%</Text>
      </View>

      <Text style={styles.footerText}>SAFETY ENGINE: ACTIVE</Text>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 12,
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  status: {
    fontSize: 9,
    fontWeight: '900',
    fontFamily: typography.fonts.mono,
  },
  pulseContainer: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
  },
  pulseCircle: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
  },
  core: {
    width: 12,
    height: 12,
    borderRadius: 6,
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  scoreText: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '900',
    marginTop: 10,
  },
  footerText: {
    color: colors.textTertiary,
    fontSize: 7,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginTop: 8,
  }
});

export default EthicalPulse;
