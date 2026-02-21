import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
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

  return (
    <View style={styles.container}>
      <View style={styles.leftSection}>
        {title ? (
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation?.goBack()}
            disabled={!navigation?.canGoBack()}
          >
            {navigation?.canGoBack() && (
                <Ionicons name="chevron-back" size={normalize(24)} color={colors.text} style={{ marginRight: 8 }} />
            )}
            <Text style={[styles.brandText, { color: colors.text }]}>{title}</Text>
          </TouchableOpacity>
        ) : (
          <>
            <View style={styles.logoContainer}>
                <Image 
                    source={require('../../../assets/images/logo.png')} 
                    style={styles.logo}
                    resizeMode="contain"
                />
            </View>
            <Text style={[styles.brandText, { color: colors.text }]}>cospira</Text>
          </>
        )}
      </View>

      <View style={styles.rightSection}>
        {isAuthenticated ? (
          <TouchableOpacity style={styles.iconButton}>
            <View>
              <Ionicons name="notifications-outline" size={normalize(24)} color={isDark ? colors.text : '#1e293b'} />
              <View style={[styles.badge, { borderColor: isDark ? colors.surface : '#f3f4ff' }]}>
                <Text style={styles.badgeText}>2</Text>
              </View>
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={[styles.signInBtn, { backgroundColor: colors.primary }]} 
            onPress={() => navigation?.navigate('Login')}
          >
            <Text style={styles.signInText}>Sign In</Text>
          </TouchableOpacity>
        )}
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
    paddingTop: hp(1.5), 
    paddingBottom: hp(1.5),
    backgroundColor: 'transparent',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoContainer: {
    width: normalize(32),
    height: normalize(32),
    marginRight: 8,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  brandText: {
    fontSize: normalize(20),
    fontWeight: '600', // Premium weight
    letterSpacing: -0.5,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
  },
  badge: {
    position: 'absolute',
    right: -4,
    top: -4,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#f3f4ff',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: 'bold',
  },
  signInBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 14,
  },
  signInText: {
    color: '#ffffff',
    fontSize: normalize(14),
    fontWeight: '500', // Premium button weight
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default DashboardHeader;
