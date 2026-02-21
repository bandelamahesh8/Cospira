import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors } from '../../core/theme/colors';
import { typography } from '../../core/theme/typography';
import { spacing } from '../../core/theme/spacing';
import SystemHeader from '../../components/system-panels/SystemHeader';
import GlassCard from '../../components/cards/GlassCard';

const DecisionEngineScreen = ({ navigation }) => {
  const decisions = [
    { id: 1023, action: 'Switch Protocol: PRO', reason: 'Packet anomaly + latency spike', confidence: '91%', time: '10:42 AM' },
    { id: 1022, action: 'Route Optimization', reason: 'Server A load > 80%', confidence: '98%', time: '10:35 AM' },
    { id: 1021, action: 'Auto-mute User [Unknown]', reason: 'Toxic language pattern', confidence: '85%', time: '10:30 AM' },
  ];

  return (
    <View style={styles.container}>
      <SystemHeader 
        title="DECISION ENGINE" 
        subtitle="LOGIC AUDIT TRAIL" 
        onBack={() => navigation?.goBack()}
      />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {decisions.map(d => (
          <View key={d.id} style={styles.decisionRow}>
            <View style={styles.timelineLine} />
            <View style={styles.timelineDot} />
            
            <GlassCard style={styles.card}>
              <View style={styles.header}>
                <Text style={styles.idText}>#{d.id}</Text>
                <Text style={styles.timeText}>{d.time}</Text>
              </View>
              
              <Text style={styles.actionText}>{d.action}</Text>
              
              <View style={styles.metaRow}>
                 <Text style={styles.reasonText}>Reason: {d.reason}</Text>
              </View>
              
              <View style={styles.confidenceRow}>
                 <Text style={styles.confidenceLabel}>Confidence:</Text>
                 <View style={styles.confidenceBar}>
                    <View style={[styles.confidenceFill, { width: d.confidence }]} />
                 </View>
                 <Text style={styles.confidenceValue}>{d.confidence}</Text>
              </View>
            </GlassCard>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingLeft: spacing.xl,
  },
  decisionRow: {
    marginBottom: spacing.lg,
    position: 'relative',
  },
  timelineLine: {
    position: 'absolute',
    left: -20,
    top: 0,
    bottom: -spacing.lg,
    width: 2,
    backgroundColor: colors.border,
  },
  timelineDot: {
    position: 'absolute',
    left: -24,
    top: 15,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.secondary,
    borderWidth: 2,
    borderColor: colors.background,
  },
  card: {
    borderColor: colors.secondaryDim,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  idText: {
    color: colors.textTertiary,
    fontFamily: typography.fonts.mono,
    fontSize: 10,
  },
  timeText: {
    color: colors.textTertiary,
    fontSize: 10,
  },
  actionText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  metaRow: {
    marginBottom: 16,
  },
  reasonText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontStyle: 'italic',
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  confidenceLabel: {
    color: colors.secondary,
    fontSize: 10,
    marginRight: 8,
    fontWeight: 'bold',
  },
  confidenceBar: {
    flex: 1,
    height: 4,
    backgroundColor: colors.surface,
    borderRadius: 2,
    marginRight: 8,
  },
  confidenceFill: {
    height: '100%',
    backgroundColor: colors.secondary,
  },
  confidenceValue: {
    color: colors.textPrimary,
    fontSize: 10,
    width: 30, 
    textAlign: 'right',
  }
});

export default DecisionEngineScreen;
