import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { normalize, wp } from '../../utils/responsive';
import { useTheme } from '../../hooks/useTheme';

const ActivityItem = ({ type, title, subtitle, time, icon, color, duration }) => {
  const { colors, isDark } = useTheme();

  const getIcon = () => {
    switch (type) {
      case 'room':
      case 'room_created': 
        return 'apps-outline';
      case 'achievement': 
        return 'trophy-outline';
      case 'social':
      case 'global_connect':
        return 'people-outline';
      case 'match':
      case 'game_started':
        return 'game-controller-outline';
      default: return icon || 'notifications-outline';
    }
  };

  const getThemeColor = () => {
    switch (type) {
      case 'room':
      case 'room_created':
        return '#2F6BFF';
      case 'achievement': 
        return '#F59E0B';
      case 'social':
      case 'global_connect':
        return '#10B981';
      case 'match':
      case 'game_started':
        return '#EF4444';
      default: return color || colors.primary;
    }
  };

  const activityColor = getThemeColor();

  const formatDuration = (seconds) => {
    if (!seconds) return null;
    const mins = Math.floor(seconds / 60);
    if (mins < 1) return '< 1m';
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
  };

  return (
    <View style={[
      styles.container,
      { 
        backgroundColor: isDark ? 'rgba(15, 23, 42, 0.45)' : 'rgba(255, 255, 255, 0.85)',
        borderColor: isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(15, 23, 42, 0.1)',
      }
    ]}>
      <View style={[styles.iconBox, { backgroundColor: activityColor + '20' }]}>
        <Ionicons name={getIcon()} size={normalize(20)} color={activityColor} />
      </View>
      
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{title}</Text>
        <View style={styles.subtitleRow}>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>{subtitle}</Text>
          {duration > 0 && (
            <>
              <Text style={[styles.dot, { color: colors.textSecondary }]}>•</Text>
              <Text style={[styles.duration, { color: activityColor }]}>{formatDuration(duration)}</Text>
            </>
          )}
        </View>
      </View>

      <Text style={styles.time}>{time}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: normalize(12),
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  iconBox: {
    width: normalize(42),
    height: normalize(42),
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    marginLeft: 15,
  },
  title: {
    fontSize: normalize(14),
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Space Grotesk',
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  subtitle: {
    fontSize: normalize(11),
    maxWidth: '70%',
  },
  dot: {
    marginHorizontal: 4,
    fontSize: normalize(11),
  },
  duration: {
    fontSize: normalize(10),
    fontWeight: '700',
  },
  time: {
    fontSize: normalize(10),
    color: '#94a3b8',
    fontWeight: '600',
  }
});

export default ActivityItem;
