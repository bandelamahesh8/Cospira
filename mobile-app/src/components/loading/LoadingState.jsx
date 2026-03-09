import React from 'react';
import { View, StyleSheet, Animated, Platform } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { normalize } from '../../utils/responsive';

/**
 * Loading State Component
 * Premium skeleton loader with shimmer effect
 */
const LoadingState = ({ 
  variant = 'card', 
  count = 1,
  style,
}) => {
  const { colors, isDark } = useTheme();
  const shimmerAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const shimmerStyle = {
    opacity: shimmerAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 0.7],
    }),
  };

  const renderSkeleton = () => {
    switch (variant) {
      case 'card':
        return (
          <Animated.View style={[styles.card, { backgroundColor: colors.surface }, shimmerStyle]}>
            <View style={styles.cardHeader}>
              <View style={[styles.avatar, { backgroundColor: colors.border }]} />
              <View style={styles.cardHeaderText}>
                <View style={[styles.titleLine, { backgroundColor: colors.border }]} />
                <View style={[styles.subtitleLine, { backgroundColor: colors.border }]} />
              </View>
            </View>
            <View style={styles.cardBody}>
              <View style={[styles.bodyLine, { backgroundColor: colors.border }]} />
              <View style={[styles.bodyLine, { backgroundColor: colors.border }]} />
              <View style={[styles.bodyLine, { backgroundColor: colors.border, width: '60%' }]} />
            </View>
          </Animated.View>
        );
      
      case 'list':
        return (
          <Animated.View style={[styles.listItem, { backgroundColor: colors.surface }, shimmerStyle]}>
            <View style={[styles.listIcon, { backgroundColor: colors.border }]} />
            <View style={styles.listContent}>
              <View style={[styles.listTitle, { backgroundColor: colors.border }]} />
              <View style={[styles.listSubtitle, { backgroundColor: colors.border }]} />
            </View>
          </Animated.View>
        );

      case 'activity':
        return (
          <Animated.View style={[
            styles.activityItem, 
            { 
              backgroundColor: isDark ? 'rgba(15, 23, 42, 0.45)' : 'rgba(255, 255, 255, 0.85)',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(15, 23, 42, 0.1)',
            },
            shimmerStyle
          ]}>
            <View style={[styles.activityIcon, { backgroundColor: colors.border }]} />
            <View style={styles.activityContent}>
              <View style={[styles.activityTitle, { backgroundColor: colors.border }]} />
              <View style={[styles.activitySubtitle, { backgroundColor: colors.border }]} />
            </View>
            <View style={[styles.activityTime, { backgroundColor: colors.border }]} />
          </Animated.View>
        );
      
      case 'profile':
        return (
          <Animated.View style={[styles.profile, shimmerStyle]}>
            <View style={[styles.profileAvatar, { backgroundColor: colors.border }]} />
            <View style={[styles.profileName, { backgroundColor: colors.border }]} />
            <View style={[styles.profileBio, { backgroundColor: colors.border }]} />
          </Animated.View>
        );
      
      default:
        return (
          <Animated.View style={[styles.default, { backgroundColor: colors.surface }, shimmerStyle]} />
        );
    }
  };

  return (
    <View style={[styles.container, style]}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={styles.item}>
          {renderSkeleton()}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  item: {
    marginBottom: 16,
  },
  
  // Card Skeleton
  card: {
    borderRadius: 18,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 16,
  },
  cardHeaderText: {
    flex: 1,
    justifyContent: 'center',
  },
  titleLine: {
    height: 16,
    borderRadius: 4,
    marginBottom: 8,
    width: '60%',
  },
  subtitleLine: {
    height: 12,
    borderRadius: 4,
    width: '40%',
  },
  cardBody: {
    gap: 8,
  },
  bodyLine: {
    height: 12,
    borderRadius: 4,
  },
  
  // List Skeleton
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
  },
  listIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 16,
  },
  listContent: {
    flex: 1,
  },
  listTitle: {
    height: 14,
    borderRadius: 4,
    marginBottom: 8,
    width: '70%',
  },
  listSubtitle: {
    height: 12,
    borderRadius: 4,
    width: '50%',
  },

  // Activity Skeleton
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: normalize(12),
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  activityIcon: {
    width: normalize(42),
    height: normalize(42),
    borderRadius: 12,
  },
  activityContent: {
    flex: 1,
    marginLeft: 15,
  },
  activityTitle: {
    height: normalize(14),
    borderRadius: 4,
    marginBottom: 4,
    width: '60%',
  },
  activitySubtitle: {
    height: normalize(11),
    borderRadius: 4,
    width: '40%',
  },
  activityTime: {
    width: normalize(40),
    height: normalize(10),
    borderRadius: 4,
  },
  
  // Profile Skeleton
  profile: {
    alignItems: 'center',
    padding: 24,
  },
  profileAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  profileName: {
    height: 20,
    width: 150,
    borderRadius: 4,
    marginBottom: 12,
  },
  profileBio: {
    height: 14,
    width: 200,
    borderRadius: 4,
  },
  
  // Default Skeleton
  default: {
    height: 100,
    borderRadius: 14,
  },
});

export default LoadingState;
