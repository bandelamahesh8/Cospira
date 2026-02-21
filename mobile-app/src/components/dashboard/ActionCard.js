import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { wp, hp, normalize } from '../../utils/responsive';
import { useTheme } from '../../hooks/useTheme';

const ActionCard = ({ title, subtitle, icon, iconLibrary, color, onPress }) => {
  const { colors, isDark } = useTheme();
  const IconComponent = iconLibrary || Ionicons;
  
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.iconContainer, { backgroundColor: isDark ? colors.surface : '#f1f5f9' }]}>
            <IconComponent name={icon} size={normalize(24)} color={isDark ? colors.text : color} />
        </View>
        <Text 
            style={[styles.title, { color: colors.text }]}
            numberOfLines={1}
        >
            {title}
        </Text>
        <Text 
            style={[styles.subtitle, { color: colors.textSecondary }]}
            numberOfLines={1}
        >
            {subtitle}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minWidth: wp(28),
    marginHorizontal: wp(1),
  },
  card: {
    flex: 1,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  iconContainer: {
    width: normalize(40),
    height: normalize(40),
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: normalize(13),
    fontWeight: '600', // Premium weight
    textAlign: 'center',
    marginBottom: 4,
    width: '100%',
  },
  subtitle: {
    fontSize: normalize(10),
    textAlign: 'center',
    fontWeight: '400', // Premium weight
    width: '100%',
  },
});

export default ActionCard;
