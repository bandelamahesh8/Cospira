import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { theme } from '../../core/theme';
import { spacing } from '../../core/theme/spacing';
import GlassCard from '../cards/GlassCard';

const EnterpriseDashboard = ({ stats, audit }) => {
  if (!stats) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>ENTERPRISE INTELLIGENCE</Text>
      
      <View style={styles.mainStats}>
         <GlassCard style={styles.healthCard}>
            <Text style={styles.label}>ORG HEALTH SCORE</Text>
            <Text style={[styles.healthValue, { color: stats.healthScore > 80 ? theme.colors.success : theme.colors.warning }]}>
               {stats.healthScore}
            </Text>
            <View style={styles.indicatorTrack}>
               <View style={[styles.indicatorFill, { width: `${stats.healthScore}%`, backgroundColor: stats.healthScore > 80 ? theme.colors.success : theme.colors.warning }]} />
            </View>
         </GlassCard>
      </View>

      <View style={styles.grid}>
         <GlassCard style={styles.gridItem}>
            <Text style={styles.gridLabel}>AVG TRUST</Text>
            <Text style={styles.gridValue}>{stats.avgTrust}%</Text>
         </GlassCard>
         <GlassCard style={styles.gridItem}>
            <Text style={styles.gridLabel}>AVG RISK</Text>
            <Text style={[styles.gridValue, { color: theme.colors.danger }]}>{stats.avgRisk}%</Text>
         </GlassCard>
      </View>

      <Text style={styles.sectionTitle}>POLICY COMPLIANCE</Text>
      <View style={styles.policyList}>
         {audit.policies.length > 0 ? (
           audit.policies.map((p, idx) => {
             const hasViolation = audit.logs.some(l => l.violations.some(v => v.policyId === p.id));
             return (
               <View key={idx} style={styles.policyRow}>
                  <View style={[styles.statusDot, { backgroundColor: hasViolation ? theme.colors.danger : theme.colors.success }]} />
                  <Text style={styles.policyName}>{p.name.toUpperCase()}</Text>
                  <Text style={styles.policyStatus}>{hasViolation ? 'VIOLATION' : 'COMPLIANT'}</Text>
               </View>
             );
           })
         ) : (
           <Text style={styles.emptyText}>No Org-wide policies defined.</Text>
         )}
      </View>

      <View style={styles.roomsRow}>
         <Text style={styles.roomsLabel}>SUPERVISED ROOMS</Text>
         <Text style={styles.roomsValue}>{stats.activeRooms}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.xl,
    paddingBottom: 20,
  },
  header: {
    color: theme.colors.textSecondary,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 16,
    textAlign: 'center',
  },
  mainStats: {
    marginBottom: 12,
  },
  healthCard: {
    padding: 20,
    alignItems: 'center',
  },
  healthValue: {
    fontSize: 42,
    fontWeight: 'bold',
    fontFamily: theme.typography.fonts.mono,
    marginVertical: 10,
  },
  indicatorTrack: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  indicatorFill: {
    height: '100%',
  },
  grid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  gridItem: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
  },
  gridLabel: {
    color: theme.colors.textTertiary,
    fontSize: 7,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  gridValue: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: theme.typography.fonts.mono,
  },
  sectionTitle: {
    color: theme.colors.textSecondary,
    fontSize: 8,
    fontWeight: 'bold',
    marginBottom: 12,
    letterSpacing: 1,
  },
  policyList: {
    gap: 10,
    marginBottom: 20,
  },
  policyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 10,
  },
  policyName: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: 9,
    fontWeight: 'bold',
  },
  policyStatus: {
    color: theme.colors.textTertiary,
    fontSize: 7,
    fontWeight: 'bold',
  },
  roomsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  roomsLabel: {
    color: theme.colors.textTertiary,
    fontSize: 8,
    fontWeight: 'bold',
  },
  roomsValue: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  label: {
    color: theme.colors.textTertiary,
    fontSize: 8,
    fontWeight: 'bold',
  },
  emptyText: {
    color: theme.colors.textTertiary,
    fontSize: 9,
    fontStyle: 'italic',
  }
});

export default EnterpriseDashboard;
