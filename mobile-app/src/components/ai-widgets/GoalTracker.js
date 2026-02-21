import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors } from '../../core/theme/colors';
import { typography } from '../../core/theme/typography';
import { spacing } from '../../core/theme/spacing';
import GlassCard from '../cards/GlassCard';

const GoalTracker = ({ activeGoal }) => {
  if (!activeGoal) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
         <View style={styles.titleRow}>
            <View style={styles.liveDot} />
            <Text style={styles.headerText}>AUTONOMOUS GOAL EXECUTION</Text>
         </View>
         <Text style={styles.goalDescription}>{activeGoal.description.toUpperCase()}</Text>
      </View>

      <View style={styles.path}>
        {activeGoal.steps.map((step, idx) => (
          <View key={step.id} style={styles.stepContainer}>
            <View style={styles.stepIndicator}>
               <View style={[
                 styles.dot, 
                 step.status === 'SUCCESS' && styles.dotSuccess,
                 step.status === 'IN_PROGRESS' && styles.dotActive
               ]} />
               {idx < activeGoal.steps.length - 1 && <View style={styles.line} />}
            </View>
            
            <GlassCard style={[styles.stepCard, step.status === 'IN_PROGRESS' && styles.activeCard]}>
               <View style={styles.stepHeader}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={[styles.stepStatus, { color: getStatusColor(step.status) }]}>{step.status}</Text>
               </View>
               
               {step.status === 'IN_PROGRESS' && (
                 <View style={styles.progressContainer}>
                    <View style={styles.track}>
                       <View style={[styles.fill, { width: `${step.progress}%` }]} />
                    </View>
                    <Text style={styles.agentTag}>ASSIGNED: {step.assignedAgent?.toUpperCase()}</Text>
                 </View>
               )}
            </GlassCard>
          </View>
        ))}
      </View>
    </View>
  );
};

const getStatusColor = (status) => {
  switch (status) {
    case 'SUCCESS': return colors.success;
    case 'IN_PROGRESS': return colors.primary;
    case 'FAILED': return colors.danger;
    default: return colors.textTertiary;
  }
};

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.xl,
    paddingBottom: 20,
  },
  header: {
    marginBottom: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.danger,
  },
  headerText: {
    color: colors.textSecondary,
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  goalDescription: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '900',
    fontFamily: typography.fonts.mono,
  },
  path: {
    paddingLeft: 4,
  },
  stepContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 0,
  },
  stepIndicator: {
    alignItems: 'center',
    width: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#333',
    borderWidth: 2,
    borderColor: '#000',
    zIndex: 2,
  },
  dotSuccess: {
    backgroundColor: colors.success,
  },
  dotActive: {
    backgroundColor: colors.primary,
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: -2,
  },
  stepCard: {
    flex: 1,
    padding: 12,
    marginBottom: 16,
  },
  activeCard: {
    borderColor: 'rgba(0, 153, 255, 0.3)',
    borderWidth: 1,
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepTitle: {
    color: colors.textPrimary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  stepStatus: {
    fontSize: 7,
    fontWeight: 'bold',
    fontFamily: typography.fonts.mono,
  },
  progressContainer: {
    marginTop: 10,
  },
  track: {
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 1,
    overflow: 'hidden',
    marginBottom: 6,
  },
  fill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  agentTag: {
    color: colors.textTertiary,
    fontSize: 7,
    fontWeight: 'bold',
  }
});

export default GoalTracker;
