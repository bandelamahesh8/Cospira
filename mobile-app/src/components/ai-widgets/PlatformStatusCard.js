import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../core/theme/colors';
import { typography } from '../../core/theme/typography';
import { spacing } from '../../core/theme/spacing';
import GlassCard from '../cards/GlassCard';

const PlatformStatusCard = ({ sessions, lastSync }) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>AI ECOSYSTEM CONNECTIVITY</Text>
        {lastSync && (
          <Text style={styles.syncTag}>LAST SYNC: {new Date(lastSync.timestamp).toLocaleTimeString()}</Text>
        )}
      </View>

      <GlassCard style={styles.card}>
        <View style={styles.deviceRow}>
          {['MOBILE', 'WEB', 'DESKTOP'].map(platform => {
            const activeSession = sessions.find(s => s.platform === platform);
            return (
              <View key={platform} style={styles.deviceItem}>
                 <View style={[
                   styles.platformIcon, 
                   { backgroundColor: activeSession ? colors.primary : 'rgba(255,255,255,0.05)' }
                 ]}>
                    <Text style={[styles.iconText, { color: activeSession ? '#000' : '#444' }]}>
                       {platform[0]}
                    </Text>
                 </View>
                 <Text style={[styles.platformName, activeSession && styles.activeName]}>{platform}</Text>
                 <View style={[styles.statusDot, { backgroundColor: activeSession ? colors.success : 'transparent' }]} />
              </View>
            );
          })}
        </View>

        <View style={styles.divider} />

        <View style={styles.summaryRow}>
           <View>
              <Text style={styles.label}>ACTIVE NODES</Text>
              <Text style={styles.value}>{sessions.length}</Text>
           </View>
           <View style={styles.alignRight}>
              <Text style={styles.label}>ECOSYSTEM HEALTH</Text>
              <Text style={[styles.value, { color: colors.success }]}>OPTIMAL</Text>
           </View>
        </View>
      </GlassCard>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    color: colors.textSecondary,
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  syncTag: {
    color: colors.primary,
    fontSize: 7,
    fontWeight: 'bold',
  },
  card: {
    padding: 16,
  },
  deviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  deviceItem: {
    alignItems: 'center',
  },
  platformIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  iconText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  platformName: {
    color: colors.textTertiary,
    fontSize: 8,
    fontWeight: 'bold',
  },
  activeName: {
    color: colors.textPrimary,
  },
  statusDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    color: colors.textTertiary,
    fontSize: 7,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  value: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: typography.fonts.mono,
  },
  alignRight: {
    alignItems: 'flex-end',
  }
});

export default PlatformStatusCard;
