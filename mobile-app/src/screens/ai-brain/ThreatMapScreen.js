import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors } from '../../core/theme/colors';
import { typography } from '../../core/theme/typography';
import { spacing } from '../../core/theme/spacing';
import SystemHeader from '../../components/system-panels/SystemHeader';
import GlassCard from '../../components/cards/GlassCard';
import StatusBadge from '../../components/ai-widgets/StatusBadge';

const ThreatMapScreen = ({ navigation }) => {
  // Mock Threats
  const threats = [
    { id: 1, type: 'Network Intrusion', severity: 'High', location: 'Server Node A', time: '2m ago' },
    { id: 2, type: 'Anomaly', severity: 'Medium', location: 'Data Pipe 4', time: '14m ago' },
  ];

  return (
    <View style={styles.container}>
      <SystemHeader 
        title="THREAT MAP" 
        subtitle="SYSTEM SECURITY LAYER" 
        onBack={() => navigation?.goBack()}
      />
      
      <View style={styles.mapContainer}>
        <View style={styles.radarCircle1} />
        <View style={styles.radarCircle2} />
        <View style={styles.radarCircle3} />
        <View style={styles.blip} />
        <Text style={styles.scanningText}>SCANNING NETWORK...</Text>
      </View>

      <ScrollView contentContainerStyle={styles.listContainer}>
        <View style={styles.headerRow}>
          <Text style={styles.listHeader}>DETECTED THREATS ({threats.length})</Text>
        </View>

        {threats.map(t => (
          <GlassCard key={t.id} style={styles.threatCard}>
             <View style={styles.cardHeader}>
               <Text style={[styles.threatType, t.severity === 'High' && { color: colors.danger }]}>
                 {t.type.toUpperCase()}
               </Text>
               <StatusBadge 
                  status={t.severity === 'High' ? 'danger' : 'warning'} 
                  text={t.severity} 
                />
             </View>
             <Text style={styles.location}>Loc: {t.location}</Text>
             <Text style={styles.timestamp}>{t.time}</Text>
          </GlassCard>
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
  mapContainer: {
    height: 300,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    overflow: 'hidden',
  },
  radarCircle1: {
    width: 250, height: 250,
    borderRadius: 125,
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 68, 0.2)',
    position: 'absolute',
  },
  radarCircle2: {
    width: 150, height: 150,
    borderRadius: 75,
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 68, 0.4)',
    position: 'absolute',
  },
  radarCircle3: {
    width: 50, height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 0, 68, 0.1)',
    position: 'absolute',
  },
  blip: {
    width: 8, height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
    position: 'absolute',
    top: 80,
    left: '60%',
    shadowColor: colors.danger,
    shadowRadius: 5,
    shadowOpacity: 1,
    elevation: 5,
  },
  scanningText: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    color: colors.danger,
    fontSize: 10,
    fontFamily: typography.fonts.mono,
  },
  listContainer: {
    padding: 16,
  },
  headerRow: {
    marginBottom: 16,
  },
  listHeader: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  threatCard: {
    marginBottom: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  threatType: {
    color: colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  location: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  timestamp: {
    color: colors.textTertiary,
    fontSize: 10,
    marginTop: 4,
    textAlign: 'right',
  }
});

export default ThreatMapScreen;
