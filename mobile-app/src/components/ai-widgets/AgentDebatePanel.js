import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { theme } from '../../core/theme';
import { spacing } from '../../core/theme/spacing';
import GlassCard from '../cards/GlassCard';

const AgentDebatePanel = ({ logs }) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AGENT DEBATE STREAM</Text>
        <Text style={styles.liveIndicator}>LIVE BROADCAST</Text>
      </View>
      
      <ScrollView 
        style={styles.logScroll}
        contentContainerStyle={styles.scrollContent}
        nestedScrollEnabled={true}
      >
        {logs.map((log) => (
          <View key={log.id} style={styles.messageRow}>
            <View style={styles.agentTag}>
              <Text style={styles.agentInitials}>{log.from.substring(0, 1).toUpperCase()}</Text>
            </View>
            <View style={styles.bubble}>
              <View style={styles.bubbleHeader}>
                <Text style={styles.agentName}>{log.from.toUpperCase()}</Text>
                <Text style={styles.topicTag}>#{log.topic}</Text>
              </View>
              <Text style={styles.messageText}>
                {typeof log.payload === 'string' ? log.payload : JSON.stringify(log.payload)}
              </Text>
              <Text style={styles.timestamp}>
                {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </Text>
            </View>
          </View>
        ))}
        {logs.length === 0 && (
          <Text style={styles.emptyText}>Waiting for inter-agent traffic...</Text>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.lg,
    height: 300,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  headerTitle: {
    color: theme.colors.textSecondary,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  liveIndicator: {
    color: theme.colors.danger,
    fontSize: 8,
    fontWeight: 'bold',
  },
  logScroll: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  scrollContent: {
    padding: 12,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  agentTag: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 4,
  },
  agentInitials: {
    color: '#000',
    fontSize: 10,
    fontWeight: 'bold',
  },
  bubble: {
    flex: 1,
  },
  bubbleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  agentName: {
    color: theme.colors.textPrimary,
    fontSize: 11,
    fontWeight: 'bold',
    marginRight: 8,
  },
  topicTag: {
    color: theme.colors.secondary,
    fontSize: 9,
    fontFamily: theme.typography.fonts.mono,
  },
  messageText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  timestamp: {
    color: theme.colors.textTertiary,
    fontSize: 8,
    marginTop: 4,
    textAlign: 'right',
  },
  emptyText: {
    color: theme.colors.textTertiary,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 100,
    fontStyle: 'italic',
  }
});

export default AgentDebatePanel;
