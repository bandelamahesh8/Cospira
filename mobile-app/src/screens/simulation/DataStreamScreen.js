import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors } from '../../core/theme/colors';
import { typography } from '../../core/theme/typography';
import SystemHeader from '../../components/system-panels/SystemHeader';

const DataStreamScreen = ({ navigation }) => {
  // Mock Data Stream
  const logs = Array(20).fill(0).map((_, i) => ({
    width: Math.random() * 100,
    hex: `0x${Math.floor(Math.random()*16777215).toString(16).toUpperCase()}`,
    msg: `Packet [${i}] received from core logic layer. Latency: ${Math.floor(Math.random()*20)}ms`,
    id: i
  }));

  return (
    <View style={styles.container}>
      <SystemHeader 
        title="DATA STREAM" 
        subtitle="RAW I/O LOGS" 
        onBack={() => navigation?.goBack()}
      />
      
      <ScrollView style={styles.console} contentContainerStyle={styles.scrollContent}>
         {logs.map((log) => (
           <View key={log.id} style={styles.logLine}>
              <Text style={styles.hex}>{log.hex}</Text>
              <Text style={styles.msg}>{log.msg}</Text>
           </View>
         ))}
         <View style={styles.cursor} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // Pitch black for terminal feel
  },
  console: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  scrollContent: {
    padding: 16,
  },
  logLine: {
    flexDirection: 'row',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  hex: {
    color: colors.primary,
    fontFamily: typography.fonts.mono,
    fontSize: 10,
    marginRight: 8,
    width: 60,
  },
  msg: {
    color: colors.success,
    fontFamily: typography.fonts.mono,
    fontSize: 10,
    flex: 1,
  },
  cursor: {
    width: 10,
    height: 14,
    backgroundColor: colors.success,
    marginTop: 8,
  }
});

export default DataStreamScreen;
