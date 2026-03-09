import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { wp, hp, normalize } from '../../utils/responsive';
import { useTheme } from '../../hooks/useTheme';

const ActionCard = ({ title, subtitle, icon, iconLibrary, color, onPress, variant = 'compact' }) => {
  const { colors, isDark } = useTheme();
  const IconComponent = iconLibrary || Ionicons;
  
  if (variant === 'wide') {
    return (
        <TouchableOpacity 
            style={styles.wideContainer} 
            onPress={onPress} 
            activeOpacity={0.85}
        >
            <LinearGradient
                colors={['#1D4ED8', '#1E3A8A', '#0B1F3A']} // More vibrant fade
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.wideGradient}
            >
                <View style={styles.wideContent}>
                    <View style={styles.wideIconBox}>
                        <IconComponent name={icon} size={normalize(24)} color="#fff" />
                    </View>
                    <View style={styles.wideTextContainer}>
                        <Text style={styles.wideTitle} numberOfLines={1}>{title}</Text>
                        <Text style={styles.wideSubtitle} numberOfLines={1}>{subtitle}</Text>
                    </View>
                </View>
                <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.4)" />
                
                {/* Decorative element */}
                <View style={styles.wideGlow} />
            </LinearGradient>
        </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
        <View style={[styles.card, { 
            backgroundColor: isDark ? 'rgba(15, 23, 42, 0.5)' : 'rgba(255, 255, 255, 0.65)', 
            borderColor: isDark ? 'rgba(255, 255, 255, 0.45)' : 'rgba(15, 23, 42, 0.2)',
            borderWidth: 1.5 
        }]}>
        <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
            <IconComponent name={icon} size={normalize(22)} color={color} />
        </View>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{title}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>{subtitle}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginVertical: 6,
  },
  wideContainer: {
    width: '100%',
    height: normalize(85),
    borderRadius: normalize(16),
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: '#0B1F3A', // Force navy background
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  wideGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    position: 'relative',
  },
  wideContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  wideIconBox: {
    width: normalize(48),
    height: normalize(48),
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  wideTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  wideTitle: {
    fontSize: normalize(18),
    fontWeight: 'bold',
    color: '#fff',
  },
  wideSubtitle: {
    fontSize: normalize(12),
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },
  wideGlow: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 100,
    height: 100,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 50,
  },
  card: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'flex-start', // Match Join Room style
    justifyContent: 'center',
    borderWidth: 1,
    height: normalize(120),
  },
  iconContainer: {
    width: normalize(40),
    height: normalize(40),
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: normalize(15),
    fontWeight: 'bold',
    textAlign: 'left',
    marginBottom: 2,
    width: '100%',
  },
  subtitle: {
    fontSize: normalize(10),
    textAlign: 'left',
    fontWeight: '500',
    width: '100%',
  },
});

export default ActionCard;
