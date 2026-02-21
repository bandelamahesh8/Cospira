import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../core/theme/colors';
import { typography } from '../../core/theme/typography';
import { spacing } from '../../core/theme/spacing';
import GlassCard from '../cards/GlassCard';

const KernelMonitor = ({ kernelData }) => {
  if (!kernelData) return null;

  const { kernel, registry } = kernelData;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>AI OS KERNEL v{kernel.version}</Text>
        <Text style={styles.uptime}>UPTIME: {Math.floor(kernel.uptime / 60)}m {kernel.uptime % 60}s</Text>
      </View>

      <GlassCard style={styles.monitorCard}>
        <View style={styles.kernelStats}>
          <View style={styles.statBox}>
             <Text style={styles.statLabel}>THREADS</Text>
             <Text style={styles.statValue}>{kernel.threads}</Text>
          </View>
          <View style={[styles.statBox, { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.1)' }]}>
             <Text style={styles.statLabel}>SYSTEM STATUS</Text>
             <Text style={[styles.statValue, { color: colors.success }]}>{kernel.status}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <Text style={styles.registryLabel}>NEURAL CORE REGISTRY</Text>
        <View style={styles.registryList}>
          {Object.entries(registry).map(([name, data]) => (
            <View key={name} style={styles.moduleRow}>
               <View style={styles.moduleInfo}>
                 <View style={[styles.indicator, { backgroundColor: data.status === 'ACTIVE' ? colors.success : colors.danger }]} />
                 <Text style={styles.moduleName}>{name.replace('_', ' ')}</Text>
               </View>
               <View style={styles.throughputBar}>
                  <View style={[styles.throughputFill, { width: `${data.throughput}%` }]} />
               </View>
               <Text style={styles.versionTag}>v{data.version}</Text>
            </View>
          ))}
        </View>
      </GlassCard>
      
      <Text style={styles.footer}>COSPIRA AUTONOMOUS KERNEL LAYER</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.xl,
    marginBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  title: {
    color: colors.textSecondary,
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  uptime: {
    color: colors.textTertiary,
    fontSize: 7,
    fontFamily: typography.fonts.mono,
  },
  monitorCard: {
    padding: 16,
  },
  kernelStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    color: colors.textTertiary,
    fontSize: 7,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statValue: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: typography.fonts.mono,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginBottom: 16,
  },
  registryLabel: {
    color: colors.textSecondary,
    fontSize: 8,
    fontWeight: 'bold',
    marginBottom: 12,
    opacity: 0.7,
  },
  registryList: {
    gap: 10,
  },
  moduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  moduleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '40%',
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  moduleName: {
    color: colors.textPrimary,
    fontSize: 8,
    fontWeight: 'bold',
  },
  throughputBar: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 2,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  throughputFill: {
    height: '100%',
    backgroundColor: colors.primary,
    opacity: 0.6,
  },
  versionTag: {
    color: colors.textTertiary,
    fontSize: 7,
    fontFamily: typography.fonts.mono,
    width: 40,
    textAlign: 'right',
  },
  footer: {
    textAlign: 'center',
    color: colors.textTertiary,
    fontSize: 7,
    fontWeight: 'bold',
    marginTop: 12,
    opacity: 0.4,
    letterSpacing: 2,
  }
});

export default KernelMonitor;
