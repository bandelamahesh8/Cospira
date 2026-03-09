import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { normalize, wp } from '../../utils/responsive';

const FeaturedEventBanner = ({ onPress }) => {
  return (
    <TouchableOpacity 
      activeOpacity={0.95} 
      onPress={onPress}
      style={styles.container}
    >
      <View style={styles.glassCard}>
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0.05)']}
          style={styles.gradient}
        >
          <View style={styles.badge}>
            <View style={styles.dot} />
            <Text style={styles.badgeText}>FEATURED EVENT</Text>
          </View>
          
          <Text style={styles.title}>Strategy Masters{"\n"}Championship</Text>
          <Text style={styles.subtitle}>Join the elite tournament starting this weekend.</Text>
          
          <TouchableOpacity style={styles.viewButton} onPress={onPress}>
            <Text style={styles.viewButtonText}>View</Text>
            <Ionicons name="arrow-forward" size={14} color="#000" />
          </TouchableOpacity>
        </LinearGradient>
      </View>
      
      {/* Decorative Glows */}
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: wp(5),
    marginVertical: normalize(15),
    height: normalize(140),
    borderRadius: normalize(20),
    overflow: 'visible',
    position: 'relative',
  },
  glassCard: {
    flex: 1,
    borderRadius: normalize(20),
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    overflow: 'hidden',
  },
  gradient: {
    flex: 1,
    padding: normalize(20),
    justifyContent: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    paddingHorizontal: normalize(10),
    paddingVertical: normalize(4),
    borderRadius: normalize(10),
    marginBottom: normalize(10),
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2F6BFF',
    marginRight: 6,
  },
  badgeText: {
    fontSize: normalize(9),
    fontWeight: '800',
    color: '#2F6BFF',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: normalize(20),
    fontWeight: 'bold',
    color: '#111827',
    lineHeight: normalize(24),
    marginBottom: normalize(4),
  },
  subtitle: {
    fontSize: normalize(12),
    color: '#4B5563',
    fontWeight: '500',
    maxWidth: '80%',
  },
  viewButton: {
    position: 'absolute',
    bottom: normalize(15),
    right: normalize(15),
    backgroundColor: '#000',
    paddingHorizontal: normalize(15),
    height: normalize(32),
    borderRadius: normalize(10),
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
    backgroundColor: '#fff', // From screenshot
  },
  viewButtonText: {
    color: '#000',
    fontSize: normalize(12),
    fontWeight: 'bold',
  },
  glowTop: {
    position: 'absolute',
    top: -20,
    left: -20,
    width: 60,
    height: 60,
    backgroundColor: '#2F6BFF',
    opacity: 0.1,
    borderRadius: 30,
  },
  glowBottom: {
    position: 'absolute',
    bottom: -10,
    right: -10,
    width: 100,
    height: 100,
    backgroundColor: '#8B5CF6',
    opacity: 0.05,
    borderRadius: 50,
  }
});

export default FeaturedEventBanner;
