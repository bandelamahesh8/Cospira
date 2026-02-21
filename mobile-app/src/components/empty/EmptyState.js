import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { colors } from '../../core/theme/colors';
import { typography } from '../../core/theme/typography';
import { spacing } from '../../core/theme/spacing';

/**
 * Empty State Component
 * Premium empty state with icon, title, description, and optional action
 */
const EmptyState = ({
  icon = 'cube-outline',
  title = 'Nothing Here',
  description = 'No items to display',
  action = null,
  variant = 'dark',
  style,
}) => {
  const textColor = variant === 'dark' 
    ? colors.dark.text 
    : colors.light.text;
    
  const secondaryColor = variant === 'dark' 
    ? colors.dark.textSecondary 
    : colors.light.textSecondary;

  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconContainer}>
        <Ionicons 
          name={icon} 
          size={80} 
          color={colors.dark.textSecondary}
        />
      </View>
      
      <Text style={[styles.title, { color: textColor }]}>
        {title}
      </Text>
      
      <Text style={[styles.description, { color: secondaryColor }]}>
        {description}
      </Text>
      
      {action && (
        <View style={styles.actionContainer}>
          {action}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  iconContainer: {
    marginBottom: spacing.lg,
    opacity: 0.5,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  description: {
    fontSize: typography.sizes.md,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
    maxWidth: 280,
  },
  actionContainer: {
    marginTop: 16,
  },
});

export default EmptyState;
