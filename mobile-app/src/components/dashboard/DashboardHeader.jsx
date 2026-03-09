import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Platform } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { authStore } from '../../store/authStore';
import { wp, hp, normalize } from '../../utils/responsive';
import { useTheme } from '../../hooks/useTheme';

const DashboardHeader = ({ navigation, title }) => {
  const { colors, isDark } = useTheme();
  const [isAuthenticated, setIsAuthenticated] = React.useState(authStore.isAuthenticated);

  React.useEffect(() => {
    const unsubscribe = authStore.subscribe(() => {
      setIsAuthenticated(authStore.isAuthenticated);
    });
    return unsubscribe;
  }, []);

  const user = authStore.user;
  const profileImage = user?.profileImage;

  return (
    <View style={styles.container}>
      <View style={styles.leftSection}>
        <TouchableOpacity 
          style={styles.profileContainer}
          onPress={() => navigation?.navigate('Profile')}
        >
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: isDark ? '#1e293b' : '#e2e8f0' }]}>
              <Ionicons name="person" size={normalize(20)} color={colors.textSecondary} />
            </View>
          )}
          <View style={styles.avatarRing} />
        </TouchableOpacity>
        
        <Text style={[styles.brandText, { color: colors.text }]}>{title || 'Home'}</Text>
      </View>

      <View style={styles.rightSection}>
        <TouchableOpacity style={[styles.notiButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
          <Ionicons name="notifications-outline" size={normalize(22)} color={colors.text} />
          {/* Subtle badge if needed, but mockup shows clean bell */}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: wp(6),
    paddingTop: Platform.OS === 'ios' ? hp(1) : hp(2),
    paddingBottom: hp(1.5),
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  profileContainer: {
    width: normalize(36),
    height: normalize(36),
    borderRadius: normalize(18),
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: normalize(18),
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  brandText: {
    fontSize: normalize(22),
    fontWeight: '800',
    letterSpacing: -0.5,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Space Grotesk',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notiButton: {
    width: normalize(40),
    height: normalize(40),
    borderRadius: normalize(20),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
});

export default DashboardHeader;
