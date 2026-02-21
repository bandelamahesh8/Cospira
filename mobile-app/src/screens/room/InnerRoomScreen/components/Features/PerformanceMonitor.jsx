import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';

const PerformanceMonitor = ({ latency = 0, bandwidth = 'unknown', frameRate = 0 }) => {
  const [fps, setFps] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    setFps(frameRate);

    // Alert if performance drops
    if (frameRate < 10 || latency > 400) {
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 0.7, duration: 500, useNativeDriver: true }),
      ]).start();
    }
  }, [frameRate, latency, fadeAnim]);

  const getPerformanceColor = () => {
    if (frameRate >= 15) return '#10b981'; // Green
    if (frameRate >= 8) return '#f59e0b'; // Amber
    return '#ef4444'; // Red
  };

  const getLatencyColor = () => {
    if (latency < 150) return '#10b981';
    if (latency < 300) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.row}>
        <View style={styles.metric}>
          <Text style={styles.label}>FPS</Text>
          <Text style={[styles.value, { color: getPerformanceColor() }]}>{fps}</Text>
        </View>

        <View style={styles.metric}>
          <Text style={styles.label}>PING</Text>
          <Text style={[styles.value, { color: getLatencyColor() }]}>{latency}ms</Text>
        </View>

        <View style={styles.metric}>
          <Text style={styles.label}>NET</Text>
          <Text style={styles.value}>{bandwidth.toUpperCase()}</Text>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 8,
    minWidth: 160,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  metric: {
    alignItems: 'center',
  },
  label: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: 'bold',
    marginBottom: 2,
  },
  value: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});

export default PerformanceMonitor;
