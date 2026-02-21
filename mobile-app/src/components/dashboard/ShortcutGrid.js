import React from 'react';
import { View, StyleSheet } from 'react-native';
import CospiraButton from '../buttons/CospiraButton';
import { theme } from '../../core/theme';

const ShortcutGrid = ({ shortcuts = [] }) => {
  return (
    <View style={styles.grid}>
      {shortcuts.map((shortcut, index) => (
        <View key={index} style={styles.gridItem}>
          <CospiraButton
            title={shortcut.label}
            variant={shortcut.variant || 'primary'}
            onPress={shortcut.onPress}
            style={styles.button}
            textStyle={{ fontSize: 10 }} // Smaller text for grid
          />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between', 
    marginHorizontal: -4, // Counteract padding
  },
  gridItem: {
    width: '33.33%', // 3 columns
    padding: 4,
  },
  button: {
    height: 60,
    justifyContent: 'center',
  }
});

export default ShortcutGrid;
