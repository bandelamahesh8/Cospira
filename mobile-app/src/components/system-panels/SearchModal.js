import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import { colors } from '../../core/theme/colors';
import { typography } from '../../core/theme/typography';
import { spacing } from '../../core/theme/spacing';
import { borderRadius } from '../../core/theme/borderRadius';
import GlassCard from '../cards/GlassCard';
import CospiraButton from '../buttons/CospiraButton';
import StatusBadge from '../ai-widgets/StatusBadge';

const MOCK_RESULTS = [
  { id: '1', type: 'ROOM', title: 'Sector 4 Strategy', subtitle: '3 Active Users' },
  { id: '2', type: 'USER', title: 'Agent Smith', subtitle: 'Online' },
  { id: '3', type: 'LOG', title: 'System Boot Sequence', subtitle: '2m ago' },
  { id: '4', type: 'ROOM', title: 'Deep Space Simulation', subtitle: 'Paused' },
];

const matchType = (type) => {
    switch(type) {
        case 'ROOM': return colors.primary;
        case 'USER': return colors.secondary;
        case 'LOG': return colors.textSecondary;
        default: return colors.textPrimary;
    }
}

const SearchModal = ({ visible, onClose }) => {
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');

  const filteredResults = MOCK_RESULTS.filter(item => {
    const matchText = item.title.toLowerCase().includes(query.toLowerCase());
    const matchFilter = activeFilter === 'ALL' || item.type === activeFilter;
    return matchText && matchFilter;
  });

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.container}>
        <View style={styles.header}>
            <View style={styles.inputContainer}>
                <TextInput 
                    style={styles.input}
                    placeholder="SEARCH DATABASE..."
                    placeholderTextColor={colors.textTertiary}
                    value={query}
                    onChangeText={setQuery}
                    autoFocus
                />
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Text style={styles.closeText}>CANCEL</Text>
            </TouchableOpacity>
        </View>

        <View style={styles.filters}>
            {['ALL', 'ROOM', 'USER', 'LOG'].map(f => (
                <TouchableOpacity 
                    key={f} 
                    style={[styles.filterChip, activeFilter === f && styles.activeChip]}
                    onPress={() => setActiveFilter(f)}
                >
                    <Text style={[styles.filterText, activeFilter === f && styles.activeFilterText]}>
                        {f}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>

        <FlatList
            data={filteredResults}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
                <GlassCard style={styles.resultItem}>
                    <View style={styles.resultRow}>
                        <View style={[styles.typeIndicator, { backgroundColor: matchType(item.type) }]} />
                        <View style={styles.resultInfo}>
                            <Text style={styles.resultTitle}>{item.title}</Text>
                            <Text style={styles.resultSub}>{item.subtitle}</Text>
                        </View>
                        <Text style={styles.typeLabel}>{item.type}</Text>
                    </View>
                </GlassCard>
            )}
            ListEmptyComponent={
                <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>NO RESULTS FOUND</Text>
                </View>
            }
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(5, 5, 10, 0.98)',
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: 16,
  },
  inputContainer: {
    flex: 1,
    height: 50,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginRight: 16,
    // Glow
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  input: {
    color: colors.textPrimary,
    fontSize: 16,
    fontFamily: typography.fonts.mono,
  },
  closeBtn: {
    padding: spacing.sm,
  },
  closeText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginRight: spacing.md,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  activeChip: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryDim,
  },
  filterText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  activeFilterText: {
    color: colors.primary,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 40,
  },
  resultItem: {
    marginBottom: 16,
    padding: 16,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeIndicator: {
    width: 4,
    height: 30,
    borderRadius: 2,
    marginRight: 16,
  },
  resultInfo: {
    flex: 1,
  },
  resultTitle: {
    color: colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  resultSub: {
    color: colors.textTertiary,
    fontSize: 12,
  },
  typeLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    fontFamily: typography.fonts.mono,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 40,
  },
  emptyText: {
    color: colors.textTertiary,
    fontSize: 12,
    letterSpacing: 2,
  }
});

export default SearchModal;
