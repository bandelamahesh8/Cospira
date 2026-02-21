import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../core/theme';
import { spacing } from '../../core/theme/spacing';
import GlassCard from '../cards/GlassCard';

const DigitalTwinCard = ({ twin }) => {
  if (!twin) return null;

  const getStatusColor = () => {
    switch (twin.status) {
      case 'STABLE': return theme.colors.success;
      case 'CAUTION': return theme.colors.warning;
      case 'DRIFTING': return theme.colors.danger;
      default: return theme.colors.primary;
    }
  };

  const statusColor = getStatusColor();

  return (
    <GlassCard style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.label}>DIGITAL TWIN (SHADOW MODEL)</Text>
        <View style={styles.badge}>
            <Text style={[styles.badgeText, { color: statusColor }]}>{twin.status}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.twinVisual}>
           <View style={[styles.outerRing, { borderColor: statusColor }]} />
           <View style={[styles.innerRing, { borderColor: statusColor, opacity: 0.5 }]} />
           <View style={[styles.core, { backgroundColor: statusColor }]} />
        </View>

        <View style={styles.metrics}>
          <Text style={styles.metricLabel}>STATE DRIFT</Text>
          <Text style={styles.metricValue}>{twin.driftScore}%</Text>
          
          <Text style={[styles.metricLabel, { marginTop: 8 }]}>LAST SYNC</Text>
          <Text style={styles.metricValue}>
            {twin.lastSync ? new Date(twin.lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'NEVER'}
          </Text>
        </View>
      </View>
      
      <Text style={styles.footerText}>AUTONOMOUS SIMULATION READY</Text>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 12,
    marginBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  label: {
    color: theme.colors.textSecondary,
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 8,
    fontWeight: '900',
    fontFamily: theme.typography.fonts.mono,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  twinVisual: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  outerRing: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  innerRing: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
  },
  core: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  metrics: {
    flex: 1,
  },
  metricLabel: {
    color: theme.colors.textTertiary,
    fontSize: 7,
    fontWeight: 'bold',
  },
  metricValue: {
    color: theme.colors.textPrimary,
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: theme.typography.fonts.mono,
  },
  footerText: {
    color: theme.colors.primary,
    fontSize: 7,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 12,
    opacity: 0.6,
  }
});

export default DigitalTwinCard;
