import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { colors } from '../../core/theme/colors';
import { typography } from '../../core/theme/typography';
import { spacing } from '../../core/theme/spacing';
import SystemHeader from '../../components/system-panels/SystemHeader';
import GlassCard from '../../components/cards/GlassCard';
import PremiumButton from '../../components/buttons/PremiumButton';

const TrainingModeScreen = ({ navigation }) => {
  const [autoSave, setAutoSave] = useState(true);
  const [learningRate, setLearningRate] = useState(0.01);

  return (
    <View style={styles.container}>
       <SystemHeader 
        title="TRAINING MODE" 
        subtitle="MODEL CONFIGURATION" 
        onBack={() => navigation?.goBack()}
      />

      <View style={styles.content}>
        <GlassCard style={styles.configCard}>
           <Text style={styles.cardTitle}>HYPERPARAMETERS</Text>
           
           <View style={styles.paramRow}>
              <Text style={styles.label}>Auto-Save Checkpoints</Text>
              <Switch 
                value={autoSave} 
                onValueChange={setAutoSave}
                trackColor={{ false: colors.surface, true: colors.primary }}
              />
           </View>
           
           <View style={styles.paramRow}>
              <View>
                 <Text style={styles.label}>Learning Rate</Text>
                 <Text style={styles.value}>{learningRate.toFixed(4)}</Text>
              </View>
              <View style={styles.sliderPlaceholder}>
                 <View style={[styles.sliderFill, { width: '40%' }]} />
              </View>
           </View>
        </GlassCard>

        <View style={styles.statsPanel}>
           <View style={styles.statBox}>
              <Text style={styles.statLabel}>LOSS</Text>
              <Text style={[styles.statValue, { color: colors.danger }]}>0.241</Text>
           </View>
           <View style={styles.statBox}>
              <Text style={styles.statLabel}>ACCURACY</Text>
              <Text style={[styles.statValue, { color: colors.success }]}>94.8%</Text>
           </View>
        </View>

        <PremiumButton 
           title="START TRAINING EPOCH" 
           variant="primary"
           icon="play-outline"
           onPress={() => console.log('Start training')}
           fullWidth
           style={styles.trainBtn}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.containerPadding,
  },
  configCard: {
    marginBottom: spacing.xl,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontWeight: 'bold',
    marginBottom: spacing.lg,
  },
  paramRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  value: {
    color: colors.primary,
    fontWeight: 'bold',
    fontFamily: typography.fonts.mono,
  },
  sliderPlaceholder: {
    width: 150,
    height: 4,
    backgroundColor: colors.surfaceLight || '#f1f5f9',
    borderRadius: 2,
  },
  sliderFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  statsPanel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  statBox: {
    width: '48%',
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
  },
  statLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    letterSpacing: 1,
    fontWeight: 'bold',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
  },
  trainBtn: {
    marginTop: 'auto',
  }
});

export default TrainingModeScreen;
