import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors } from '../../core/theme/colors';
import { typography } from '../../core/theme/typography';
import { spacing } from '../../core/theme/spacing';
import GlassCard from '../cards/GlassCard';

const ConflictTimeline = ({ conflicts }) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>DECISION CONFLICT MONITOR</Text>
        <View style={styles.badge}>
            <Text style={styles.badgeText}>{conflicts.length} EVENTS</Text>
        </View>
      </View>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.timelineScroll}
        contentContainerStyle={styles.scrollContent}
      >
        {conflicts.map((conflict) => (
          <GlassCard key={conflict.id} style={styles.conflictCard}>
            <View style={[styles.indicator, { backgroundColor: conflict.severity === 'HIGH' ? colors.danger : colors.warning }]} />
            <Text style={styles.topic}>{conflict.topic.toUpperCase()}</Text>
            
            <View style={styles.comparisonRow}>
              <View style={styles.decisionSide}>
                <Text style={styles.sideLabel}>AI SUGGESTED</Text>
                <Text style={styles.sideValue}>{String(conflict.aiSuggested).toUpperCase()}</Text>
              </View>
              <Text style={styles.vs}>VS</Text>
              <View style={styles.decisionSide}>
                <Text style={styles.sideLabel}>HUMAN ACTION</Text>
                <Text style={[styles.sideValue, { color: colors.danger }]}>{String(conflict.humanAction).toUpperCase()}</Text>
              </View>
            </View>
            
            <Text style={styles.timestamp}>{new Date(conflict.timestamp).toLocaleTimeString()}</Text>
          </GlassCard>
        ))}
        {conflicts.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No human-AI conflicts detected. Decision alignment: 100%.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  badge: {
     backgroundColor: 'rgba(255,255,255,0.1)',
     paddingHorizontal: 6,
     paddingVertical: 2,
     borderRadius: 4,
  },
  badgeText: {
    color: colors.textTertiary,
    fontSize: 8,
    fontWeight: 'bold',
  },
  timelineScroll: {
    marginHorizontal: -spacing.md,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    gap: 12,
  },
  conflictCard: {
    width: 200,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.danger,
  },
  indicator: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 6, height: 6,
    borderRadius: 3,
  },
  topic: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 10,
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  decisionSide: {
    flex: 1,
  },
  sideLabel: {
    color: colors.textTertiary,
    fontSize: 7,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  sideValue: {
    color: colors.textSecondary,
    fontSize: 9,
    fontWeight: 'bold',
  },
  vs: {
    color: colors.textTertiary,
    fontSize: 8,
    marginHorizontal: 4,
  },
  timestamp: {
    color: colors.textTertiary,
    fontSize: 8,
    marginTop: 10,
    textAlign: 'right',
  },
  emptyContainer: {
    width: 300,
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.success,
    fontSize: 10,
    fontStyle: 'italic',
    textAlign: 'center',
  }
});

export default ConflictTimeline;
