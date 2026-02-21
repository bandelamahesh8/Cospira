import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { wp, hp, normalize } from '../../utils/responsive';
import { useTheme } from '../../hooks/useTheme';

const AIMatchCard = ({ matchPercentage, recommendedRoom, tags, onPress }) => {
  const { colors, isDark } = useTheme();
  return (
    <View style={styles.container}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.header}>
            <View style={styles.aiBadge}>
                <MaterialCommunityIcons name="brain" size={normalize(12)} color={isDark ? '#fff' : colors.primary} />
                <Text style={[styles.aiBadgeText, { color: isDark ? '#fff' : colors.primary }]}>AI RECOMMENDATION</Text>
            </View>
            <Text style={[styles.matchTitle, { color: colors.textSecondary }]}>{matchPercentage}% compatibility</Text>
        </View>

        <View style={styles.recommendationContent}>
            <Text style={[styles.roomName, { color: colors.text }]} numberOfLines={1}>{recommendedRoom}</Text>
            <Text style={[styles.recoLabel, { color: colors.textSecondary }]}>Optimized for your current activity</Text>
        </View>

        <TouchableOpacity 
            style={styles.primaryAction} 
            activeOpacity={0.8}
            onPress={onPress}
        >
            <LinearGradient
                colors={['#8B5CF6', '#3B82F6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientBtn}
            >
                <Text style={styles.primaryActionText}>Enter</Text>
                <Ionicons name="arrow-forward" size={ normalize(18)} color="#fff" />
            </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: hp(2),
  },
  card: {
    borderRadius: 14, // Lock 14px
    padding: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    gap: 6,
  },
  aiBadgeText: {
    fontSize: normalize(10),
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  matchTitle: {
    fontSize: normalize(12),
    fontWeight: '600',
  },
  recommendationContent: {
    marginBottom: 24,
  },
  roomName: {
    fontSize: normalize(22),
    fontWeight: '600',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  recoLabel: {
    fontSize: normalize(13),
    fontWeight: '500',
  },
  primaryAction: {
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  gradientBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  primaryActionText: {
    color: '#fff',
    fontSize: normalize(16),
    fontWeight: '600',
  },
});

export default AIMatchCard;
