import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../../core/theme/colors';
import { typography } from '../../core/theme/typography';
import { spacing } from '../../core/theme/spacing';
import GlassCard from '../cards/GlassCard';

const SimulationPreviewCard = ({ latestSimulation, onPress }) => {
  if (!latestSimulation) {
    return (
      <TouchableOpacity onPress={onPress}>
        <GlassCard style={styles.card}>
          <Text style={styles.emptyText}>GENERATE "WHAT-IF" SCENARIOS</Text>
          <Text style={styles.subText}>Predict future risks & stability</Text>
        </GlassCard>
      </TouchableOpacity>
    );
  }

  const result = latestSimulation.results;
  const isSafe = result.predictedStability > 70;

  return (
    <TouchableOpacity onPress={onPress}>
      <GlassCard style={[styles.card, { borderRightWidth: 2, borderRightColor: isSafe ? colors.success : colors.danger }]}>
        <View style={styles.header}>
          <Text style={styles.label}>LATEST PREDICTION</Text>
          <Text style={styles.status}>{latestSimulation.status}</Text>
        </View>
        
        <Text style={styles.scenarioName}>{latestSimulation.scenario}</Text>
        
        <View style={styles.resultsRow}>
          <View>
            <Text style={styles.metricLabel}>PREDICTED STABILITY</Text>
            <Text style={[styles.metricValue, { color: isSafe ? colors.success : colors.danger }]}>
              {result.predictedStability}%
            </Text>
          </View>
          <View style={styles.predictionBox}>
             <Text style={styles.boxLabel}>OUTCOME</Text>
             <Text style={styles.boxValue}>{result.riskLevel}</Text>
          </View>
        </View>
      </GlassCard>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 12,
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 8,
    fontWeight: 'bold',
  },
  status: {
    color: colors.primary,
    fontSize: 8,
    fontWeight: 'bold',
    opacity: 0.7,
  },
  scenarioName: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  resultsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricLabel: {
    color: colors.textTertiary,
    fontSize: 7,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: typography.fonts.mono,
  },
  predictionBox: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    alignItems: 'center',
  },
  boxLabel: {
    color: colors.textTertiary,
    fontSize: 6,
    fontWeight: 'bold',
  },
  boxValue: {
    color: colors.textPrimary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  emptyText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subText: {
    color: colors.textSecondary,
    fontSize: 8,
    textAlign: 'center',
    marginTop: 4,
  }
});

export default SimulationPreviewCard;
