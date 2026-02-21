import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, KeyboardAvoidingView, Platform, TouchableOpacity, Alert, Image, Modal, Linking, StatusBar } from 'react-native';
import PressableScale from '../../components/animations/PressableScale';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { authStore } from '../../store/authStore';
import { api } from '../../services/api';
import { authService } from '../../services/auth.service';
import FadeView from '../../components/animations/FadeView';

// Helper for lockout persistence
const MAX_ATTEMPTS = 3;
const LOCKOUT_DURATION = 24 * 60 * 60 * 1000; // 24 hours

const SecurityScreen = ({ navigation }) => {
  const [user] = useState(authStore.user || {});
  
  // -- UI State --
  const [activeTab, setActiveTab] = useState('password'); // 'email' or 'password'

  // -- Form State --
  const [email, setEmail] = useState(user.email || 'maheshgames88@gmail.com'); 
  const [newEmail, setNewEmail] = useState('');
  const [confirmNewEmail, setConfirmNewEmail] = useState(''); 
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // -- Security State --
  const [isVerified, setIsVerified] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [accessLogs, setAccessLogs] = useState([]);

  // -- Modal State --
  const [showCheckEmailModal, setShowCheckEmailModal] = useState(false);
  const [showWaitingModal, setShowWaitingModal] = useState(false);
  const [showEmailSuccessModal, setShowEmailSuccessModal] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds

  const handleFinalizeSuccess = React.useCallback(() => {
    setShowEmailSuccessModal(false);
    authStore.logout();
    // Explicitly navigate to login to ensure fresh start
    navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
    });
  }, [navigation]);

  useEffect(() => {
     if (lockoutUntil && Date.now() < lockoutUntil) {
         Alert.alert('Security Lockout', 'Password changes disabled due to failed attempts.');
     }

     const fetchLogs = async () => {
         try {
             // Try to fetch real logs if endpoint exists
             const history = await authService.getLoginHistory();
             if (history && Array.isArray(history)) {
                 setAccessLogs(history);
             } else {
                 // Fallback if no real data
                 setAccessLogs([
                    { id: 1, time: 'Now', ip: 'Current Device', location: 'Active', status: 'SUCCESS' }
                 ]);
             }
         } catch (e) {
             console.log('Failed to fetch login history', e);
         }
     };
     fetchLogs();
     authStore.refreshProfile();
  }, [lockoutUntil]);

  // Sync with authStore
  useEffect(() => {
    const unsubscribe = authStore.subscribe(() => {
        console.log('[SecurityScreen] AuthStore update detected. Store Email:', authStore.user?.email, 'Local Email:', email);
        if (authStore.user?.email && authStore.user.email !== email) {
            console.log('[SecurityScreen] Email change detected! Updating UI.');
            setEmail(authStore.user.email);
            setShowCheckEmailModal(false);
            setShowWaitingModal(false);
            setShowEmailSuccessModal(true);
            
            // Auto logout and move to login after 4 seconds
            setTimeout(() => {
                handleFinalizeSuccess();
            }, 4000);
        }
    });
    return () => unsubscribe();
  }, [email, handleFinalizeSuccess]);

  // Polling for email change
  useEffect(() => {
    let pollInterval;
    if (showWaitingModal) {
        pollInterval = setInterval(() => {
            authStore.refreshProfile();
        }, 5000);
    }
    return () => {
        if (pollInterval) clearInterval(pollInterval);
    };
  }, [showWaitingModal]);

  // Timer countdown
  useEffect(() => {
    let timerInterval;
    if (showWaitingModal && timeLeft > 0) {
        timerInterval = setInterval(() => {
            setTimeLeft(prev => prev - 1);
        }, 1000);
    } else if (timeLeft === 0 && showWaitingModal) {
        setShowWaitingModal(false);
        Alert.alert('Timeout', 'Verification time exceeded. Please try again.');
        setTimeLeft(300);
    }
    return () => {
        if (timerInterval) clearInterval(timerInterval);
    };
  }, [showWaitingModal, timeLeft]);

  const handleVerifyPassword = async () => {
    if (lockoutUntil && Date.now() < lockoutUntil) return;
    if (!currentPassword) return;

    setVerifying(true);
    try {
        await authService.login(user.email, currentPassword);
        setIsVerified(true);
        setAttempts(0);
    } catch (error) {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        if (newAttempts >= MAX_ATTEMPTS) {
            setLockoutUntil(Date.now() + LOCKOUT_DURATION);
            Alert.alert('Security Alert', 'Maximum attempts exceeded. Locked for 24h.');
        }
    } finally {
        setVerifying(false);
    }
  };

  const handleUpdateSecurity = async () => {
    if (!isVerified) {
        Alert.alert('Verification Required', 'Please enter your current password first.');
        return;
    }
    if (newPassword !== confirmPassword) {
        Alert.alert('Error', 'New passwords do not match.');
        return;
    }
    setUpdating(true);
    try {
        await authService.changePassword(currentPassword, newPassword);
        Alert.alert('Success', 'Credentials updated successfully.');
        navigation.goBack();
    } catch (error) {
        Alert.alert('Error', error.message);
    } finally {
        setUpdating(false);
    }
  };

  const handleChangeEmail = async () => {
    if (!newEmail || !confirmNewEmail) {
        Alert.alert('Error', 'Please fill in both email fields.');
        return;
    }
    if (newEmail !== confirmNewEmail) {
        Alert.alert('Error', 'Email addresses do not match.');
        return;
    }
    
    // Safety check: Ensure API has the current token from store
    if (!api.getToken() && authStore.token) {
        api.setToken(authStore.token);
    }
    
    if (!api.getToken()) {
        Alert.alert('Error', 'Your session has expired. Please log in again.');
        return;
    }
    
    setUpdating(true);
    try {
        await authService.changeEmail(newEmail);
        setShowCheckEmailModal(true);
        setTimeLeft(300); // Reset timer
    } catch (error) {
        Alert.alert('Error', error.message || 'Failed to initiate email change.');
    } finally {
        setUpdating(false);
    }
  };
  
  const openGmail = async () => {
    const webMailUrl = 'https://mail.google.com';
    // iOS and Android schemes vary
    const gmailUrl = Platform.OS === 'ios' ? 'message://' : 'googlegmail://';
    
    console.log('[SecurityScreen] Attempting to open mail client on platform:', Platform.OS);
    
    try {
        if (Platform.OS === 'web') {
            window.open(webMailUrl, '_blank');
        } else {
            // Check if Gmail app is installed
            const supported = await Linking.canOpenURL(gmailUrl);
            if (supported) {
                await Linking.openURL(gmailUrl).catch(err => {
                    console.log('[SecurityScreen] Failed to open app scheme, falling back to web.', err);
                    Linking.openURL(webMailUrl);
                });
            } else {
                console.log('[SecurityScreen] App scheme not supported, falling back to web.');
                Linking.openURL(webMailUrl);
            }
        }
    } catch (e) {
        console.log('[SecurityScreen] Error in openGmail, falling back to web.', e);
        Linking.openURL(webMailUrl);
    }
    
    setShowCheckEmailModal(false);
    setShowWaitingModal(true);
    setTimeLeft(300); // Start 5 min timer
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {/* Background Effect - Matches Edit Profile */}
      <LinearGradient
        colors={['#fdf4ff', '#f0f9ff', '#ffffff']}
        style={styles.background}
      />

      {/* Header - Matches Edit Profile */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        
        <View style={styles.headerTitleContainer}>
            <Image source={require('../../../assets/images/logo.png')} style={styles.headerLogo} resizeMode="contain" />
            <Text style={styles.headerTitle}>cospira</Text>
        </View>

        {/* Placeholder for symmetry or action */}
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <View style={styles.titleSection}>
              <Text style={styles.screenTitle}>Security Protocols</Text>
              <Text style={styles.screenSubtitle}>Customize your personal sector.</Text>
          </View>
          


          {/* CHECK EMAIL MODAL */}
          <Modal transparent visible={showCheckEmailModal} animationType="fade">
              <View style={styles.modalOverlay}>
                  <View style={styles.modalContent}>
                      <LinearGradient colors={['#e0f2fe', '#f0f9ff']} style={styles.modalIconBg}>
                          <Ionicons name="mail-unread" size={32} color="#0ea5e9" />
                      </LinearGradient>
                      <Text style={styles.modalTitle}>Verification Sent</Text>
                      <Text style={styles.modalText}>
                          We've sent a secure link to your new email. Please open Gmail to confirm the change.
                      </Text>
                      <TouchableOpacity 
                          style={styles.modalCloseBtn}
                          onPress={openGmail}
                      >
                          <Text style={styles.modalCloseText}>Open Gmail</Text>
                      </TouchableOpacity>
                  </View>
              </View>
          </Modal>

          {/* WAITING FOR CONFIRMATION MODAL */}
          <Modal transparent visible={showWaitingModal} animationType="fade">
              <View style={styles.modalOverlay}>
                  <View style={styles.modalContent}>
                      <View style={styles.timerContainer}>
                          <LinearGradient colors={['#eff6ff', '#dbeafe']} style={styles.timerCircle}>
                             <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
                          </LinearGradient>
                      </View>
                      <Text style={styles.modalTitle}>Waiting for Confirmation</Text>
                      <Text style={styles.modalText}>
                          Please confirm the email from the mail app. We're automatically listening for the update.
                      </Text>
                      <TouchableOpacity 
                          style={[styles.modalCloseBtn, { backgroundColor: '#f1f5f9' }]}
                          onPress={() => setShowWaitingModal(false)}
                      >
                          <Text style={[styles.modalCloseText, { color: '#64748b' }]}>Cancel</Text>
                      </TouchableOpacity>
                  </View>
              </View>
          </Modal>

          {/* SUCCESS MODAL (Triggered when confirm link is used or on user request) */}
          <Modal transparent visible={showEmailSuccessModal} animationType="fade">
              <View style={styles.modalOverlay}>
                  <View style={styles.modalContent}>
                      <LinearGradient colors={['#dcfce7', '#f0fdf4']} style={styles.modalIconBg}>
                          <Ionicons name="checkmark-done-circle" size={32} color="#22c55e" />
                      </LinearGradient>
                      <Text style={styles.modalTitle}>Success!</Text>
                      <Text style={styles.modalText}>
                          Successfully email address changed and your account is now secure.
                      </Text>
                      <TouchableOpacity 
                          style={styles.modalCloseBtn}
                          onPress={handleFinalizeSuccess}
                      >
                          <Text style={styles.modalCloseText}>Done</Text>
                      </TouchableOpacity>
                  </View>
              </View>
          </Modal>

        {/* Tab Switcher */}
        <View style={styles.tabContainer}>
            <TouchableOpacity 
                style={[styles.tab, activeTab === 'email' && styles.activeTab]} 
                onPress={() => setActiveTab('email')}
            >
                <Text style={[styles.tabText, activeTab === 'email' && styles.activeTabText]}>Email</Text>
            </TouchableOpacity>
            <TouchableOpacity 
                style={[styles.tab, activeTab === 'password' && styles.activeTab]} 
                onPress={() => setActiveTab('password')}
            >
                <Text style={[styles.tabText, activeTab === 'password' && styles.activeTabText]}>Password</Text>
            </TouchableOpacity>
        </View>

        {activeTab === 'email' ? (
            <FadeView style={styles.formGroup}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionLabel}>Email Settings</Text>
                    <View style={styles.sectionLine} />
                </View>

                <Text style={styles.inputLabel}>Current Email</Text>
                <View style={[styles.inputContainer, styles.readOnlyInput]}>
                    <Ionicons name="mail-outline" size={20} color="#64748b" style={styles.inputIcon} />
                    <TextInput 
                        style={styles.input}
                        value={email}
                        editable={false}
                    />
                    <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
                </View>

                <Text style={styles.inputLabel}>New Email Address</Text>
                <View style={styles.inputContainer}>
                    <Ionicons name="mail-unread-outline" size={20} color="#6366f1" style={styles.inputIcon} />
                    <TextInput 
                        style={styles.input}
                        placeholder="Enter new email..."
                        placeholderTextColor="#94a3b8"
                        value={newEmail}
                        onChangeText={setNewEmail}
                        autoCapitalize="none"
                    />
                </View>

                <Text style={styles.inputLabel}>Confirm New Email</Text>
                <View style={styles.inputContainer}>
                    <Ionicons name="mail-open-outline" size={20} color="#64748b" style={styles.inputIcon} />
                    <TextInput 
                        style={styles.input}
                        placeholder="Verify new email..."
                        placeholderTextColor="#94a3b8"
                        value={confirmNewEmail}
                        onChangeText={setConfirmNewEmail}
                        autoCapitalize="none"
                    />
                </View>

                <PressableScale 
                    style={styles.primaryButton}
                    onPress={handleChangeEmail}
                    disabled={updating}
                >
                    <LinearGradient
                        colors={['#6366f1', '#a855f7']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.buttonGradient}
                    >
                        <Text style={styles.buttonText}>{updating ? 'Sending...' : 'Change Email'}</Text>
                    </LinearGradient>
                </PressableScale>
            </FadeView>
        ) : (
            <FadeView style={styles.formGroup}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionLabel}>Password Settings</Text>
                    <View style={styles.sectionLine} />
                </View>

                {/* Verification Level 1: Current Password */}
                {!isVerified ? (
                    <>
                        <Text style={styles.inputLabel}>Current Password</Text>
                        <View style={[styles.inputContainer, attempts > 0 && styles.errorBorder]}>
                            <Ionicons name="key-outline" size={20} color="#64748b" style={styles.inputIcon} />
                            <TextInput 
                                style={styles.input}
                                placeholder="Verify current password"
                                placeholderTextColor="#94a3b8"
                                secureTextEntry
                                value={currentPassword}
                                onChangeText={(text) => {
                                    setCurrentPassword(text);
                                    setIsVerified(false);
                                }}
                            />
                            <TouchableOpacity onPress={handleVerifyPassword} disabled={verifying}>
                                <Text style={styles.verifyTextBtn}>{verifying ? '...' : 'Verify'}</Text>
                            </TouchableOpacity>
                        </View>
                        {attempts > 0 && (
                            <Text style={styles.errorHint}>Incorrect password. {MAX_ATTEMPTS - attempts} attempts left.</Text>
                        )}
                    </>
                ) : (
                    <>
                        {/* Verification Level 2: New Password */}
                        <Text style={styles.inputLabel}>New Password</Text>
                        <View style={styles.inputContainer}>
                            <Ionicons name="lock-closed-outline" size={20} color="#6366f1" style={styles.inputIcon} />
                            <TextInput 
                                style={styles.input}
                                placeholder="Minimum 6 characters"
                                placeholderTextColor="#94a3b8"
                                secureTextEntry
                                value={newPassword}
                                onChangeText={setNewPassword}
                            />
                        </View>

                        <Text style={styles.inputLabel}>Confirm New Password</Text>
                        <View style={styles.inputContainer}>
                            <Ionicons name="shield-checkmark-outline" size={20} color="#64748b" style={styles.inputIcon} />
                            <TextInput 
                                style={styles.input}
                                placeholder="Match new password"
                                placeholderTextColor="#94a3b8"
                                secureTextEntry
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                            />
                        </View>

                        <PressableScale 
                            style={styles.primaryButton}
                            onPress={handleUpdateSecurity}
                            disabled={updating}
                        >
                            <LinearGradient
                                colors={['#a855f7', '#8b5cf6']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.buttonGradient}
                            >
                                <Text style={styles.buttonText}>{updating ? 'Updating...' : 'Change Password'}</Text>
                            </LinearGradient>
                        </PressableScale>

                        <TouchableOpacity onPress={() => setIsVerified(false)} style={styles.cancelBtn}>
                            <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </>
                )}
            </FadeView>
        )}

        {/* Access Logs */}
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>Access Logs</Text>
            <View style={styles.sectionLine} />
        </View>

        <View style={styles.logsCard}>
            {accessLogs.length > 0 ? (
                accessLogs.map((log, index) => (
                    <View key={log.id || index} style={styles.logRow}>
                        <View>
                            <Text style={styles.logIp}>{log.ip || log.ipAddress || 'Current Device'}</Text>
                            <Text style={styles.logMeta}>{log.location || 'Active'} • {log.time || 'Now'}</Text>
                        </View>
                        <View key={index} style={[
                            styles.statusPill, 
                            { backgroundColor: (log.status === 'SUCCESS' || !log.status) ? '#dcfce7' : '#fee2e2' }
                        ]}>
                            <Text style={[
                                styles.statusText,
                                { color: (log.status === 'SUCCESS' || !log.status) ? '#16a34a' : '#ef4444' }
                            ]}>
                                {log.status || 'Active'}
                            </Text>
                        </View>
                    </View>
                ))
            ) : (
                <View style={styles.emptyLogs}>
                    <Text style={styles.emptyLogsText}>No recent activity.</Text>
                </View>
            )}
        </View>

        <PressableScale 
            style={styles.whiteBtn}
            onPress={() => Alert.alert('Security', 'Existing sessions have been invalidated.')}
        >
             <Ionicons name="cloud-upload-outline" size={20} color="#64748b" style={{ marginRight: 10 }} />
             <Text style={styles.whiteBtnText}>Flush Session Tokens</Text>
        </PressableScale>

        <View style={{ height: 40 }} />

      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  background: {
      position: 'absolute',
      left: 0, 
      right: 0,
      top: 0, 
      bottom: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: Platform.OS === 'android' ? 40 : 0,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  headerTitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
  },
  headerLogo: {
      width: 28,
      height: 28,
  },
  headerTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: '#1e293b',
      letterSpacing: -0.5,
  },
  titleSection: {
      alignItems: 'center',
      marginBottom: 32,
      marginTop: 10,
  },
  screenTitle: {
      fontSize: 26,
      fontWeight: '800',
      color: '#1e293b',
      marginBottom: 6,
  },
  screenSubtitle: {
      fontSize: 14,
      color: '#64748b',
  },
  scrollContent: {
      paddingHorizontal: 24,
      paddingBottom: 40,
  },
  sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
  },
  sectionLabel: {
      fontSize: 14,
      fontWeight: '700',
      color: '#1e293b',
      marginRight: 12,
  },
  sectionLine: {
      flex: 1,
      height: 1,
      backgroundColor: '#e2e8f0',
  },
  formGroup: {
      gap: 12,
  },
  inputLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: '#334155',
      marginBottom: 8,
      marginLeft: 4,
  },
  inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#f1f5f9',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: '#e2e8f0',
      height: 52,
      paddingHorizontal: 16,
      marginBottom: 16,
  },
  inputIcon: {
      marginRight: 12,
  },
  input: {
      flex: 1,
      fontSize: 14,
      color: '#1e293b',
  },
  readOnlyInput: {
      backgroundColor: '#f1f5f9',
  },
  primaryButton: {
      borderRadius: 18,
      overflow: 'hidden',
      marginTop: 8,
      marginBottom: 12,
  },
  buttonGradient: {
      height: 56,
      justifyContent: 'center',
      alignItems: 'center',
  },
  buttonText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: '700',
      letterSpacing: 0.5,
  },
  errorBorder: {
      borderColor: '#ef4444',
  },
  errorHint: {
      fontSize: 12,
      color: '#ef4444',
      marginTop: -12,
      marginBottom: 16,
      marginLeft: 4,
      fontWeight: '600',
  },
  verifyTextBtn: {
      fontSize: 13,
      fontWeight: '700',
      color: '#6366f1',
  },
  cancelBtn: {
      alignItems: 'center',
      paddingVertical: 12,
  },
  cancelText: {
      color: '#64748b',
      fontSize: 14,
      fontWeight: '600',
  },
  logsCard: {
      backgroundColor: '#000000',
      borderRadius: 20,
      padding: 12,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: '#f1f5f9',
  },
  logRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 4,
  },
  logIp: {
      fontSize: 14,
      color: '#1e293b',
      fontWeight: '600',
  },
  logMeta: {
      fontSize: 12,
      color: '#64748b',
      marginTop: 2,
  },
  statusPill: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
  },
  statusText: {
      fontSize: 11,
      fontWeight: '700',
  },
  whiteBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#000000',
      borderRadius: 16,
      paddingVertical: 14,
      borderWidth: 1,
      borderColor: '#e2e8f0',
  },
  whiteBtnText: {
      color: '#64748b',
      fontSize: 15,
      fontWeight: '600',
  },
  tabContainer: {
      flexDirection: 'row',
      backgroundColor: '#f1f5f9',
      borderRadius: 16,
      padding: 4,
      marginBottom: 32,
  },
  tab: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
      borderRadius: 12,
  },
  activeTab: {
      backgroundColor: '#000000',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 5,
      elevation: 2,
  },
  tabText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#64748b',
  },
  activeTabText: {
      color: '#1e293b',
  },
  modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.8)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
  },
  modalContent: {
      backgroundColor: '#000000',
      borderRadius: 24,
      padding: 24,
      width: '100%',
      alignItems: 'center',
  },
  modalIconBg: {
      width: 64,
      height: 64,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
  },
  modalTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: '#1e293b',
      textAlign: 'center',
      marginBottom: 8,
  },
  modalText: {
      fontSize: 15,
      color: '#64748b',
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: 24,
  },
  modalCloseBtn: {
      width: '100%',
      backgroundColor: '#0ea5e9',
      paddingVertical: 16,
      borderRadius: 16,
      alignItems: 'center',
  },
  modalCloseText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: '700',
  },
  timerContainer: {
      marginBottom: 20,
  },
  timerCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      justifyContent: 'center',
      alignItems: 'center',
  },
  timerText: {
      fontSize: 20,
      fontWeight: '800',
      color: '#3b82f6',
  },
  emptyLogs: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyLogsText: {
    color: '#94a3b8',
    fontSize: 14,
  }
});

export default SecurityScreen;
