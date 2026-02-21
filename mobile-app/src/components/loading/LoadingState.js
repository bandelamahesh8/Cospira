import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors } from '../../core/theme/colors';
import { spacing } from '../../core/theme/spacing';
import { borderRadius } from '../../core/theme/borderRadius';

/**
 * Loading State Component
 * Premium skeleton loader with shimmer effect
 */
const LoadingState = ({ 
  variant = 'card', 
  count = 1,
  style,
}) => {
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
          <Animated.View style={[styles.card, shimmerStyle]}>
            <View style={styles.cardHeader}>
              <View style={styles.avatar} />
              <View style={styles.cardHeaderText}>
                <View style={styles.titleLine} />
                <View style={styles.subtitleLine} />
              </View>
            </View>
            <View style={styles.cardBody}>
              <View style={styles.bodyLine} />
              <View style={styles.bodyLine} />
              <View style={[styles.bodyLine, { width: '60%' }]} />
            </View>
          </Animated.View>
        );
      
      case 'list':
        return (
          <Animated.View style={[styles.listItem, shimmerStyle]}>
            <View style={styles.listIcon} />
            <View style={styles.listContent}>
              <View style={styles.listTitle} />
              <View style={styles.listSubtitle} />
            </View>
          </Animated.View>
        );
      
      case 'profile':
        return (
          <Animated.View style={[styles.profile, shimmerStyle]}>
            <View style={styles.profileAvatar} />
            <View style={styles.profileName} />
            <View style={styles.profileBio} />
          </Animated.View>
        );
      
      default:
        return (
          <Animated.View style={[styles.default, shimmerStyle]} />
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
    backgroundColor: colors.dark.surface,
    borderRadius: borderRadius.lg,
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
    backgroundColor: colors.dark.surfaceElevated,
    marginRight: 16,
  },
  cardHeaderText: {
    flex: 1,
    justifyContent: 'center',
  },
  titleLine: {
    height: 16,
    backgroundColor: colors.dark.surfaceElevated,
    borderRadius: 4,
    marginBottom: spacing.xs,
    width: '60%',
  },
  subtitleLine: {
    height: 12,
    backgroundColor: colors.dark.surfaceElevated,
    borderRadius: 4,
    width: '40%',
  },
  cardBody: {
    gap: spacing.sm,
  },
  bodyLine: {
    height: 12,
    backgroundColor: colors.dark.surfaceElevated,
    borderRadius: 4,
  },
  
  // List Skeleton
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.dark.surface,
    borderRadius: borderRadius.md,
  },
  listIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.dark.surfaceElevated,
    marginRight: 16,
  },
  listContent: {
    flex: 1,
  },
  listTitle: {
    height: 14,
    backgroundColor: colors.dark.surfaceElevated,
    borderRadius: 4,
    marginBottom: spacing.xs,
    width: '70%',
  },
  listSubtitle: {
    height: 12,
    backgroundColor: colors.dark.surfaceElevated,
    borderRadius: 4,
    width: '50%',
  },
  
  // Profile Skeleton
  profile: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  profileAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.dark.surfaceElevated,
    marginBottom: 16,
  },
  profileName: {
    height: 20,
    width: 150,
    backgroundColor: colors.dark.surfaceElevated,
    borderRadius: 4,
    marginBottom: spacing.sm,
  },
  profileBio: {
    height: 14,
    width: 200,
    backgroundColor: colors.dark.surfaceElevated,
    borderRadius: 4,
  },
  
  // Default Skeleton
  default: {
    height: 100,
    backgroundColor: colors.dark.surface,
    borderRadius: borderRadius.md,
  },
});

export default LoadingState;
