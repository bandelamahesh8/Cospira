import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../core/theme/colors';
import { typography } from '../../core/theme/typography';
import GlassCard from '../cards/GlassCard';

const TrustMeter = ({ score, trend }) => {
  const getTrustColor = (s) => {
    if (s >= 80) return colors.primary; // Cyan
    if (s >= 50) return colors.warning; // Amber
    return colors.danger; // Crimson
  };

  const getTrendIcon = (t) => {
    switch (t) {
      case 'UP': return '↑';
      case 'DOWN': return '↓';
      default: return '→';
    }
  };

  const color = getTrustColor(score);

  return (
    <GlassCard style={styles.card}>
      <Text style={styles.label}>SYSTEM TRUST</Text>
      <View style={styles.scoreRow}>
        <Text style={[styles.score, { color }]}>{score}%</Text>
        <Text style={[styles.trend, { color }]}>{getTrendIcon(trend)}</Text>
      </View>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${score}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.statusText}>
        {score >= 80 ? 'HIGH SYNERGY' : score >= 50 ? 'DIVERGENT' : 'CRITICAL ASYMMETRY'}
      </Text>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 12,
    flex: 1,
    marginRight: 6,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 4,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  score: {
    fontSize: 24,
    fontWeight: '900',
    marginRight: 4,
  },
  trend: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 2,
    marginBottom: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  statusText: {
    color: colors.textTertiary,
    fontSize: 7,
    fontWeight: 'bold',
    fontFamily: typography.fonts.mono,
  }
});

export default TrustMeter;
