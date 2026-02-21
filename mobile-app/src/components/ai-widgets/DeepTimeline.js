import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../../core/theme';
import { spacing } from '../../core/theme/spacing';
import GlassCard from '../cards/GlassCard';

const DeepTimeline = ({ events, onSelectEvent }) => {
  const getEventIcon = (type) => {
    switch (type) {
      case 'CONFLICT': return '⚔️';
      case 'ETHICS': return '⚖️';
      case 'MEMORY': return '🧠';
      default: return '●';
    }
  };

  const getEventColor = (event) => {
    if (event.type === 'CONFLICT') return theme.colors.danger;
    if (event.type === 'ETHICS' && event.subType === 'WARNING') return theme.colors.warning;
    if (event.type === 'ETHICS') return theme.colors.success;
    
    switch (event.subType) {
      case 'decision': return theme.colors.primary;
      case 'anomaly': return theme.colors.danger;
      case 'insight': return theme.colors.secondary;
      default: return theme.colors.textSecondary;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>COGNITIVE TIMELINE</Text>
        <Text style={styles.syncStatus}>REAL-TIME AGGREGATION</Text>
      </View>

      <View style={styles.timeline}>
        {events.map((event, index) => {
          const color = getEventColor(event);
          return (
            <View key={event.id} style={styles.eventContainer}>
              <View style={styles.leftLine}>
                <View style={[styles.dot, { backgroundColor: color }]} />
                {index < events.length - 1 && <View style={styles.line} />}
              </View>
              
              <TouchableOpacity 
                onPress={() => onSelectEvent(event)}
                activeOpacity={0.7}
                style={styles.cardWrapper}
              >
                <GlassCard style={[styles.card, { borderLeftColor: color }]}>
                  <View style={styles.cardHeader}>
                    <Text style={[styles.typeBadge, { color }]}>
                      {getEventIcon(event.type)} {event.type}
                    </Text>
                    <Text style={styles.timeText}>
                      {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  <Text style={styles.title}>{event.title}</Text>
                  <Text style={styles.detail} numberOfLines={2}>{event.detail}</Text>
                  
                  {event.agent && (
                     <Text style={styles.agentTag}>AGENT: {event.agent.toUpperCase()}</Text>
                  )}
                </GlassCard>
              </TouchableOpacity>
            </View>
          );
        })}
        
        {events.length === 0 && (
          <View style={styles.emptyContainer}>
             <Text style={styles.emptyText}>Neural pathways clear. Awaiting events...</Text>
          </View>
        )}
      </View>
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
    alignItems: 'baseline',
    marginBottom: 16,
  },
  headerTitle: {
    color: theme.colors.textSecondary,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  syncStatus: {
    color: theme.colors.primary,
    fontSize: 7,
    fontWeight: 'bold',
    opacity: 0.6,
  },
  timeline: {
    paddingLeft: 4,
  },
  eventContainer: {
    flexDirection: 'row',
  },
  leftLine: {
    width: 20,
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    zIndex: 1,
  },
  line: {
    flex: 1,
    width: 2,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  cardWrapper: {
    flex: 1,
    marginBottom: 16,
    marginLeft: 8,
  },
  card: {
    padding: 12,
    borderLeftWidth: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  typeBadge: {
    fontSize: 8,
    fontWeight: '900',
    fontFamily: theme.typography.fonts.mono,
  },
  timeText: {
    color: theme.colors.textTertiary,
    fontSize: 8,
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  detail: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    lineHeight: 16,
    opacity: 0.8,
  },
  agentTag: {
    color: theme.colors.textTertiary,
    fontSize: 7,
    fontWeight: 'bold',
    marginTop: 8,
    textAlign: 'right',
  },
  emptyContainer: {
    paddingTop: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: theme.colors.textTertiary,
    fontSize: 10,
    fontStyle: 'italic',
  }
});

export default DeepTimeline;
