import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Switch, RefreshControl, Modal } from 'react-native';
import PressableScale from '../../components/animations/PressableScale';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { StatusBar } from 'react-native';
import { theme } from '../../core/theme';
import SystemHeader from '../../components/system-panels/SystemHeader';
import GlassCard from '../../components/cards/GlassCard';
import PremiumButton from '../../components/buttons/PremiumButton';
import DashboardHeader from '../../components/dashboard/DashboardHeader';
import { authStore } from '../../store/authStore';
import { authService } from '../../services/auth.service';
import { useTheme } from '../../hooks/useTheme';

const ProfileScreen = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark);
  const [user, setUser] = React.useState(authStore.user);
  const [isAuthenticated, setIsAuthenticated] = React.useState(authStore.isAuthenticated);
  const [refreshing, setRefreshing] = React.useState(false);
  const [showLogoutModal, setShowLogoutModal] = React.useState(false);
  const [stats, setStats] = React.useState({
    timeOnline: '0h',
    commandsIssued: '0',
    systemHealth: '99%'
  });

  const fetchProfile = async () => {
      try {
          if (authStore.isAuthenticated && authStore.token) {
              console.log('[ProfileScreen] Fetching profile...');
              const response = await authService.getProfile();
              if (response) {
                   const freshUser = response.user || response.data?.user || response.data || response;
                   if (freshUser) {
                      console.log('[ProfileScreen] User updated:', freshUser.username);
                      setUser(freshUser);
                      authStore.user = freshUser; 
                   }
              }
          }
      } catch (error) {
          console.log('[ProfileScreen] Error fetching profile:', error);
      }
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchProfile();
    setRefreshing(false);
  }, []);

  React.useEffect(() => {
    // Auth Listener
    const unsubscribe = authStore.subscribe(() => {
      setUser(authStore.user);
      setIsAuthenticated(authStore.isAuthenticated);
    });

    fetchProfile();
    
    // Simulate/Fetch Stats
    const calculateStats = () => {
        const userIdVal = user?.id || user?._id || 'guest';
        const idSum = userIdVal.toString().split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        
        const baseCommands = (idSum % 500) + 50; 
        const online = ((idSum % 40) / 10 + 0.5).toFixed(1);
        const health = 90 + (idSum % 10);
        
        setStats({
            timeOnline: `${online}h`,
            commandsIssued: `${baseCommands}`,
            systemHealth: `${health}%`
        });
    };
    calculateStats();
    
    // Live update for system health
    const interval = setInterval(() => {
        setStats(prev => ({
            ...prev,
            systemHealth: `${90 + Math.floor(Math.random() * 9)}%`
        }));
    }, 5000);

    return () => {
        unsubscribe();
        clearInterval(interval);
    };
  }, [user?.id]);

  const onLogoutPress = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    setShowLogoutModal(false);
    await authStore.logout();
  };

  if (!isAuthenticated) {
      return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
            
            {/* Guest Header */}
            <View style={styles.header}>
                <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.iconBtn, { backgroundColor: isDark ? colors.surface : '#f1f5f9' }]}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>
                    <TouchableOpacity style={[styles.iconBtn, { backgroundColor: isDark ? colors.surface : '#f1f5f9' }]}>
                        <Ionicons name="settings-outline" size={24} color={colors.text} />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.guestContent}>
                {/* Guest Avatar */}
                <View style={styles.guestAvatarContainer}>
                    <Image 
                        source={{ uri: 'https://cdn-icons-png.flaticon.com/512/4140/4140048.png' }} 
                        style={styles.guestAvatar} 
                    />
                    <View style={styles.muteBadge}>
                        <Ionicons name="mic-off" size={12} color="#ffffff" />
                    </View>
                </View>

                {/* Guest Text */}
                <Text style={[styles.guestTitle, { color: colors.text }]}>Guest User</Text>
                <Text style={[styles.guestSubtitle, { color: colors.textSecondary }]}>You're in guest mode.</Text>
                <Text style={[styles.guestSubtitle, { color: colors.textSecondary }]}>Log in to save your profile and settings.</Text>

                {/* Login Button */}
                <TouchableOpacity 
                    style={styles.loginBtn}
                    onPress={() => navigation.navigate('Login')}
                >
                    <Text style={styles.loginBtnText}>Log In</Text>
                </TouchableOpacity>

                {/* Legal Links */}
                <View style={[styles.linksContainer, { backgroundColor: isDark ? colors.surface : '#f8fafc' }]}>
                    <PressableScale style={styles.linkRow} scaleTo={0.98}>
                        <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
                        <Text style={[styles.linkText, { color: colors.text }]}>Privacy Policy</Text>
                        <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                    </PressableScale>

                    <View style={[styles.linkDivider, { backgroundColor: colors.border }]} />

                    <PressableScale style={styles.linkRow} scaleTo={0.98}>
                        <Ionicons name="document-text-outline" size={20} color={colors.primary} />
                        <Text style={[styles.linkText, { color: colors.text }]}>Terms of Service</Text>
                        <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                    </PressableScale>

                    <View style={[styles.linkDivider, { backgroundColor: colors.border }]} />

                    <PressableScale style={styles.linkRow} scaleTo={0.98}>
                        <Ionicons name="help-circle-outline" size={20} color={colors.primary} />
                        <Text style={[styles.linkText, { color: colors.text }]}>Support</Text>
                        <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                    </PressableScale>
                </View>
            </View>
        </SafeAreaView>
      );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={styles.header}>
        <DashboardHeader navigation={navigation} />
        <Text style={[styles.screenTitle, { color: colors.text }]}>PROFILE</Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        
        {/* User Identity Header */}
        <View style={styles.profileHeader}>
            <Image 
                source={{ uri: user?.profileImage || `https://ui-avatars.com/api/?name=${user?.username || user?.name || user?.email || 'User'}&background=random` }} 
                style={styles.avatar} 
            />
            <View style={styles.userTextInfo}>
                <Text style={[styles.userName, { color: colors.text }]}>
                    {user?.name || user?.username || 'User'}
                </Text>
                <Text style={[styles.userHandle, { color: colors.textSecondary }]}>
                    @{user?.username || user?.email?.split('@')[0] || 'user'}
                </Text>
            </View>
        </View>

        <View style={[styles.activityCard, { backgroundColor: colors.surface }]}>
            <View style={styles.cardHeader}>
                <Ionicons name="briefcase" size={16} color="#64748b" />
                <Text style={[styles.cardHeaderText, { color: colors.textSecondary }]}>Activity</Text>
            </View>
            
            <View style={styles.activityMain}>
                <View style={styles.activityRow}>
                    <Text style={[styles.activityBigValue, { color: colors.text }]}>{stats.systemHealth.replace('%','')}</Text>
                    <View style={styles.activityLabels}>
                        <Text style={styles.activitySmallLabel}>SYS</Text>
                        <Text style={styles.activitySmallLabel}>HLTH</Text>
                    </View>
                    <View style={styles.progressContainer}>
                        <View style={styles.progressBarBg}>
                            <View style={styles.progressBarFillSmall} />
                            <View style={[styles.progressBarFillLarge, { backgroundColor: '#3b82f6' }]} />
                        </View>
                        <View style={styles.progressBarBgLower}>
                             <View style={[styles.progressBarFillFull, { backgroundColor: '#4ade80', width: stats.systemHealth }]} />
                        </View>
                    </View>
                </View>

                <View style={[styles.activityRow, { marginTop: 16 }]}>
                    <Ionicons name="wifi" size={18} color="#64748b" />
                    <Text style={[styles.activityBigValueSmall, { color: colors.text }]}>{stats.commandsIssued}</Text>
                    <Text style={styles.activityRoomsLabel}>Cmds Issued</Text>
                </View>
            </View>
        </View>

        {/* Quick Actions Grid */}
        <View style={styles.sectionHeader}>
            <Ionicons name="grid" size={16} color="#64748b" />
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Actions</Text>
        </View>

        <View style={styles.actionsGrid}>
            <PressableScale style={styles.actionButton} onPress={() => navigation.navigate('EditProfile')}>
                <View style={[styles.actionIconBox, { backgroundColor: '#e0f2fe' }]}>
                    <Ionicons name="person-outline" size={24} color="#0ea5e9" />
                </View>
                <Text style={[styles.actionLabel, { color: colors.text }]}>Edit Profile</Text>
            </PressableScale>

            <PressableScale style={styles.actionButton} onPress={() => navigation.navigate('AppAppearance')}>
                <View style={[styles.actionIconBox, { backgroundColor: '#fef3c7' }]}>
                    <Ionicons name="color-palette-outline" size={24} color="#f59e0b" />
                </View>
                <Text style={[styles.actionLabel, { color: colors.text }]}>Appearance</Text>
            </PressableScale>

            <PressableScale style={styles.actionButton} onPress={() => navigation.navigate('Security')}>
                <View style={[styles.actionIconBox, { backgroundColor: '#dcfce7' }]}>
                    <Ionicons name="shield-checkmark-outline" size={24} color="#22c55e" />
                </View>
                <Text style={[styles.actionLabel, { color: colors.text }]}>Security</Text>
            </PressableScale>

            <PressableScale style={styles.actionButton} onPress={() => console.log('Support')}>
                <View style={[styles.actionIconBox, { backgroundColor: '#f3e8ff' }]}>
                    <Ionicons name="help-buoy-outline" size={24} color="#a855f7" />
                </View>
                <Text style={[styles.actionLabel, { color: colors.text }]}>Support</Text>
            </PressableScale>

            <PressableScale style={styles.actionButton} onPress={onLogoutPress}>
                <View style={[styles.actionIconBox, { backgroundColor: '#fee2e2' }]}>
                    <Ionicons name="log-out-outline" size={24} color="#ef4444" />
                </View>
                <Text style={[styles.actionLabel, { color: colors.text }]}>Log Out</Text>
            </PressableScale>
        </View>

        <View style={styles.footerPadding} />
      </ScrollView>
      <Modal
        animationType="fade"
        transparent={true}
        visible={showLogoutModal}
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalIconContainer, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2' }]}>
                <Ionicons name="log-out" size={32} color="#ef4444" />
            </View>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Log Out</Text>
            <Text style={[styles.modalText, { color: colors.textSecondary }]}>
              you really want to logout
            </Text>
            
            <View style={styles.modalButtonsRow}>
                {/* Yes Button (Red, Smaller) */}
                <TouchableOpacity 
                  style={[styles.modalButton, styles.modalButtonYes]}
                  onPress={confirmLogout}
                >
                  <Text style={styles.modalButtonTextYes}>Yes</Text>
                </TouchableOpacity>

                {/* No Button (Blue, Larger) */}
                <TouchableOpacity 
                  style={[styles.modalButton, styles.modalButtonNo]}
                  onPress={() => setShowLogoutModal(false)}
                >
                  <Text style={styles.modalButtonTextNo}>No</Text>
                </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const createStyles = (colors, isDark) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
  },
  modalContent: {
      backgroundColor: colors.surface,
      width: '80%',
      borderRadius: 14,
      padding: 24,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.1,
      shadowRadius: 20,
      elevation: 10,
  },
  modalIconContainer: {
      width: 64,
      height: 64,
      borderRadius: 32,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
  },
  modalTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: '#1e293b',
      marginBottom: 8,
  },
  modalText: {
      fontSize: 15,
      color: '#64748b',
      textAlign: 'center',
      marginBottom: 24,
      lineHeight: 22,
  },
  modalButtonsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      width: '100%',
      justifyContent: 'center',
  },
  modalButton: {
      paddingVertical: 12,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
  },
  modalButtonYes: {
     backgroundColor: '#fee2e2',
     flex: 0.8, // Slightly smaller width share
  },
  modalButtonNo: {
     backgroundColor: '#3b82f6',
     flex: 1.2, // Larger width share
  },
  modalButtonTextYes: {
      color: '#ef4444',
      fontWeight: '700',
      fontSize: 15,
  },
  modalButtonTextNo: {
      color: '#ffffff',
      fontWeight: '700',
      fontSize: 16,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 10,
  },
  screenTitle: {
    display: 'none', // Following the design: minimal header
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 10,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginRight: 20,
    backgroundColor: '#cbd5e1',
  },
  userTextInfo: {
    justifyContent: 'center',
  },
  userName: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  userHandle: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 2,
  },
  activityCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 24,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.03,
    shadowRadius: 20,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  cardHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  activityMain: {
    paddingHorizontal: 4,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityBigValue: {
    fontSize: 48,
    fontWeight: '900',
    marginRight: 10,
    includeFontPadding: false,
  },
  activityBigValueSmall: {
    fontSize: 32,
    fontWeight: '900',
    marginHorizontal: 12,
    includeFontPadding: false,
  },
  activityLabels: {
    marginRight: 24,
  },
  activitySmallLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  progressContainer: {
    flex: 1,
    gap: 8,
  },
  progressBarBg: {
    height: 10,
    backgroundColor: isDark ? colors.surface2 : '#f1f5f9',
    borderRadius: 5,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  progressBarBgLower: {
    height: 10,
    backgroundColor: isDark ? colors.surface2 : '#f1f5f9',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFillSmall: {
    width: '30%',
    height: '100%',
    backgroundColor: '#8b5cf6',
  },
  progressBarFillLarge: {
    width: '50%',
    height: '100%',
  },
  progressBarFillFull: {
    width: '75%',
    height: '100%',
  },
  activityRoomsLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 32,
  },
  actionButton: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 2,
  },
  actionIconBox: {
    width: 54,
    height: 54,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  footerPadding: {
    height: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  iconBtn: {
    padding: 8,
    backgroundColor: colors.surface,
    borderRadius: 10,
  },
  guestContent: {
      flex: 1,
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingTop: 40,
  },
  guestAvatarContainer: {
      marginBottom: 24,
      position: 'relative',
  },
  guestAvatar: {
      width: 140,
      height: 140,
      borderRadius: 70,
      borderWidth: 4,
      borderColor: '#f8fafc',
      backgroundColor: '#1e293b',
  },
  muteBadge: {
      position: 'absolute',
      bottom: 6,
      right: 6,
      backgroundColor: '#ef4444',
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: '#ffffff',
  },
  guestTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 8,
  },
  guestSubtitle: {
      fontSize: 15,
      textAlign: 'center',
      lineHeight: 22,
  },
  loginBtn: {
      width: '100%',
      backgroundColor: colors.primary,
      paddingVertical: 16,
      borderRadius: 14,
      alignItems: 'center',
      marginTop: 32,
      marginBottom: 40,
      shadowColor: '#7c3aed',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
      elevation: 6,
  },
  loginBtnText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: '700',
  },
  linksContainer: {
      width: '100%',
      backgroundColor: colors.surface,
      borderRadius: 14,
      overflow: 'hidden',
  },
  linkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 18,
      paddingHorizontal: 20,
  },
  linkText: {
      flex: 1,
      fontSize: 15,
      fontWeight: '600',
      marginLeft: 12,
  },
  linkDivider: {
      height: 1,
      marginLeft: 52,
  }
});

export default ProfileScreen;
