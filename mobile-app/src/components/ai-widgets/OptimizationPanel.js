import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { colors } from '../../core/theme/colors';
import { typography } from '../../core/theme/typography';
import { spacing } from '../../core/theme/spacing';
import GlassCard from '../cards/GlassCard';

const OptimizationPanel = ({ settings, recommendations, onApply, onToggleAutoHeal }) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>SELF-OPTIMIZATION ENGINE</Text>
        <View style={styles.autoHealRow}>
           <Text style={styles.autoHealLabel}>AUTO-HEAL</Text>
           < Switch 
             value={settings.autoHeal} 
             onValueChange={onToggleAutoHeal}
             trackColor={{ false: '#333', true: colors.primary }}
             thumbColor={settings.autoHeal ? '#fff' : '#999'}
           />
        </View>
      </View>

      <View style={styles.recList}>
        {recommendations.length > 0 ? (
          recommendations.map((rec, idx) => (
            <GlassCard key={idx} style={[styles.recCard, rec.priority === 'CRITICAL' && styles.criticalRec]}>
              <View style={styles.recHeader}>
                 <Text style={[styles.priorityTag, { color: rec.priority === 'CRITICAL' ? colors.danger : colors.warning }]}>
                    [{rec.priority}] {rec.type}
                 </Text>
                 <TouchableOpacity style={styles.applyBtn} onPress={() => onApply(rec)}>
                    <Text style={styles.applyBtnText}>APPLY</Text>
                 </TouchableOpacity>
              </View>
              <Text style={styles.recTitle}>{rec.title}</Text>
              <Text style={styles.recDesc}>{rec.description}</Text>
            </GlassCard>
          ))
        ) : (
          <GlassCard style={styles.optimalCard}>
             <Text style={styles.optimalText}>SYSTEM PERFORMANCE AT PEAK. NO TUNING REQUIRED.</Text>
          </GlassCard>
        )}
      </View>
      
      <Text style={styles.footerNote}>ANALYZING TRUST + CONFLICT + SIMULATION TRENDS</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    color: colors.textSecondary,
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  autoHealRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  autoHealLabel: {
    color: colors.textSecondary,
    fontSize: 7,
    fontWeight: 'bold',
    marginRight: 8,
  },
  recList: {
    gap: 12,
  },
  recCard: {
    padding: 12,
    borderLeftWidth: 2,
    borderLeftColor: colors.warning,
  },
  criticalRec: {
    borderLeftColor: colors.danger,
    backgroundColor: 'rgba(255, 59, 48, 0.05)',
  },
  recHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priorityTag: {
    fontSize: 8,
    fontWeight: 'bold',
    fontFamily: typography.fonts.mono,
  },
  applyBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  applyBtnText: {
    color: '#000',
    fontSize: 8,
    fontWeight: 'bold',
  },
  recTitle: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  recDesc: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 16,
    opacity: 0.8,
  },
  optimalCard: {
    padding: 20,
    alignItems: 'center',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  optimalText: {
    color: colors.success,
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  footerNote: {
    textAlign: 'center',
    color: colors.textTertiary,
    fontSize: 7,
    fontWeight: 'bold',
    marginTop: 12,
    opacity: 0.5,
  }
});

export default OptimizationPanel;
