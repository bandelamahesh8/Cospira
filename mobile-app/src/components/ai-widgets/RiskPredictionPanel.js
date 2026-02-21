import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../core/theme/colors';
import { typography } from '../../core/theme/typography';
import GlassCard from '../cards/GlassCard';

const RiskPredictionPanel = ({ risk }) => {
  if (!risk) return null;

  return (
    <GlassCard style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.label}>RISK PROFILE</Text>
        <View style={[styles.levelBadge, { backgroundColor: risk.level === 'LOW' ? colors.success : colors.danger }]}>
          <Text style={styles.levelText}>{risk.level}</Text>
        </View>
      </View>
      
      <View style={styles.factors}>
        {risk.factors.length > 0 ? (
          risk.factors.map((f, i) => (
            <Text key={i} style={styles.factorText}>• {f}</Text>
          ))
        ) : (
          <Text style={styles.factorText}>No active behavioral risks detected.</Text>
        )}
      </View>
      
      <Text style={styles.predictionText}>
        PREDICTED STABILITY: {Math.max(0, 100 - risk.score)}%
      </Text>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 12,
    flex: 1.2,
    marginLeft: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  levelBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  levelText: {
    color: '#000',
    fontSize: 7,
    fontWeight: 'bold',
  },
  factors: {
    marginBottom: 8,
    flex: 1,
  },
  factorText: {
    color: colors.textTertiary,
    fontSize: 8,
    lineHeight: 12,
  },
  predictionText: {
    color: colors.primary,
    fontSize: 7,
    fontWeight: 'bold',
    fontFamily: typography.fonts.mono,
    textAlign: 'right',
  }
});

export default RiskPredictionPanel;
