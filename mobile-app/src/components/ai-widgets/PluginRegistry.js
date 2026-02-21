import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { colors } from '../../core/theme/colors';
import { typography } from '../../core/theme/typography';
import { spacing } from '../../core/theme/spacing';
import GlassCard from '../cards/GlassCard';

const PluginRegistry = ({ marketplace, onToggle }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>NEURAL MODULE MARKETPLACE</Text>
      
      <View style={styles.list}>
        {marketplace.map((plugin) => (
          <GlassCard key={plugin.id} style={styles.pluginCard}>
            <View style={styles.pluginInfo}>
              <View style={styles.nameRow}>
                 <Text style={styles.pluginName}>{plugin.name.toUpperCase()}</Text>
                 <Text style={styles.version}>v{plugin.version}</Text>
              </View>
              <Text style={styles.description}>{plugin.description}</Text>
              <View style={styles.metaRow}>
                 <Text style={styles.author}>BY {plugin.author.toUpperCase()}</Text>
                 <View style={styles.permsList}>
                    {plugin.permissions.map(p => (
                      <View key={p} style={styles.permBadge}>
                         <Text style={styles.permText}>{p}</Text>
                      </View>
                    ))}
                 </View>
              </View>
            </View>
            
            <View style={styles.actionArea}>
               <Switch
                 value={plugin.isInstalled}
                 onValueChange={(val) => onToggle(plugin.id, val ? 'INSTALL' : 'UNINSTALL')}
                 trackColor={{ false: '#333', true: colors.primary }}
                 thumbColor={plugin.isInstalled ? '#fff' : '#888'}
               />
               <Text style={[styles.statusText, { color: plugin.isInstalled ? colors.primary : colors.textTertiary }]}>
                  {plugin.isInstalled ? 'ACTIVE' : 'OFF'}
               </Text>
            </View>
          </GlassCard>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.xl,
    paddingBottom: 30,
  },
  header: {
    color: colors.textSecondary,
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 16,
    textAlign: 'center',
  },
  list: {
    gap: 15,
  },
  pluginCard: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pluginInfo: {
    flex: 1,
    marginRight: 16,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  pluginName: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: 'bold',
  },
  version: {
    color: colors.textTertiary,
    fontSize: 8,
    fontFamily: typography.fonts.mono,
  },
  description: {
    color: colors.textSecondary,
    fontSize: 9,
    lineHeight: 13,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  author: {
    color: colors.textTertiary,
    fontSize: 7,
    fontWeight: 'bold',
  },
  permsList: {
    flexDirection: 'row',
    gap: 4,
  },
  permBadge: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  permText: {
    color: colors.primary,
    fontSize: 6,
    fontWeight: 'bold',
  },
  actionArea: {
    alignItems: 'center',
    width: 60,
  },
  statusText: {
    fontSize: 8,
    fontWeight: 'bold',
    marginTop: 4,
  }
});

export default PluginRegistry;
