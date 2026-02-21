import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../core/theme';
import StatusBadge from '../ai-widgets/StatusBadge';

const AIOverlay = ({ sentiment, analysis }) => {
  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.aiBadge}>
          <View style={styles.greenDot} />
          <Text style={styles.aiText}>AI MONITORING</Text>
        </View>
        <View style={styles.sentimentBadge}>
          <View style={styles.cyanDot} />
          <Text style={styles.sentimentText}>SENTIMENT: {sentiment?.toUpperCase() || 'NEUTRAL'}</Text>
        </View>
      </View>
      
      <Text style={styles.idText}>ID: #8821-X • ENCRYPTED</Text>
      
      <View style={styles.divider} />
      
      {analysis && (
        <Text style={styles.analysisText}>{analysis}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
    marginRight: 6,
  },
  aiText: {
    color: '#22c55e',
    fontSize: 11,
    fontWeight: '800',
  },
  sentimentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#00ffff',
  },
  cyanDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00ffff',
    marginRight: 6,
  },
  sentimentText: {
    color: '#00ffff',
    fontSize: 11,
    fontWeight: '800',
  },
  idText: {
    color: '#00ffff',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginTop: 15,
    marginBottom: 8,
  },
  analysisText: {
    color: '#00ffff',
    fontSize: 13,
    fontWeight: '600',
  }
});

export default AIOverlay;
