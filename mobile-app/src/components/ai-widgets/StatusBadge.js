import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../core/theme/colors';
import { typography } from '../../core/theme/typography';

const StatusBadge = ({ status = 'active', text }) => {
  const getColor = () => {
    switch (status) {
      case 'active': return colors.success;
      case 'warning': return colors.warning;
      case 'danger': return colors.danger;
      case 'offline': return colors.textTertiary;
      default: return colors.primary;
    }
  };

  const color = getColor();

  return (
    <View style={[styles.container, { borderColor: color, backgroundColor: `${color}15` }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.text, { color: color }]}>
        {text ? text.toUpperCase() : status.toUpperCase()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  text: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
  }
});

export default StatusBadge;
