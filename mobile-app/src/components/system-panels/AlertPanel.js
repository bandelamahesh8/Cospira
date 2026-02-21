import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { colors as themeColors } from '../../core/theme/colors';
import { spacing } from '../../core/theme/spacing';
import CospiraButton from '../buttons/CospiraButton';

const AlertPanel = ({ visible, title, message, severity = 'critical', onAcknowledge }) => {
  if (!visible) return null;

  const getSeverityColors = () => {
    switch(severity) {
      case 'critical': return { bg: 'rgba(20, 0, 0, 0.95)', border: themeColors.danger, text: themeColors.danger };
      case 'warning': return { bg: 'rgba(20, 20, 0, 0.95)', border: themeColors.warning, text: themeColors.warning };
      default: return { bg: themeColors.surface, border: themeColors.primary, text: themeColors.primary };
    }
  };

  const colors = getSeverityColors();

  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={styles.overlay}>
        <View style={[styles.panel, { backgroundColor: colors.bg, borderColor: colors.border }]}>
           
           <View style={[styles.header, { borderBottomColor: colors.border }]}>
             <Text style={[styles.title, { color: colors.text }]}>SYSTEM ALERT: {title?.toUpperCase()}</Text>
           </View>
           
           <View style={styles.body}>
              <Text style={styles.message}>{message}</Text>
           </View>

           <View style={styles.footer}>
              <CospiraButton 
                title="ACKNOWLEDGE" 
                variant={severity === 'critical' ? 'danger' : 'primary'}
                onPress={onAcknowledge}
                style={styles.button}
              />
           </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  panel: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 2,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    marginBottom: 16,
    borderBottomWidth: 1,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  body: {
    marginBottom: spacing.xl,
  },
  message: {
    color: themeColors.textPrimary,
    fontSize: 16,
    lineHeight: 24,
  },
  footer: {
    alignItems: 'flex-end',
  },
  button: {
    width: '100%',
  }
});

export default AlertPanel;
