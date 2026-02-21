import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, Image, TouchableOpacity, ScrollView, Modal, Animated, Easing } from 'react-native';
import { StatusBar } from 'react-native';
import PressableScale from '../../components/animations/PressableScale';
import { colors } from '../../core/theme/colors';
import { typography } from '../../core/theme/typography';
import PremiumInput from '../../components/inputs/PremiumInput';
import PremiumButton from '../../components/buttons/PremiumButton';
import SocialButton from '../../components/buttons/SocialButton';
import { authStore } from '../../store/authStore';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [showLockoutModal, setShowLockoutModal] = useState(false);
  const [lockoutMessage, setLockoutMessage] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const shakeAnimation = React.useRef(new Animated.Value(0)).current;

  const startShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnimation, { toValue: 10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: -10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 0, duration: 100, useNativeDriver: true })
    ]).start();
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter both email and password');
      startShake();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await authStore.login(email, password);
      console.log("[LoginScreen] Login successful. Autonavigating via AuthStore state...");
    } catch (err) {
      const msg = err.message ? err.message.toLowerCase() : '';
      
      if (msg.includes('not registered')) {
        setShowSignupModal(true);
      } else if (msg.includes('too many failed attempts') || msg.includes('locked for')) {
        setLockoutMessage(err.message);
        setShowLockoutModal(true);
      } else {
        setError(err.message);
        startShake();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    console.log("Google Login pressed - Implementing SSO flow...");
    setError("Social login requires additional configuration.");
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
      <View style={styles.container}>
        <StatusBar style="light" />
        
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          <View style={styles.header}>
            <Image 
              source={require('../../../assets/images/logo.png')} 
              style={styles.logo} 
              resizeMode="contain"
            />
            <Text style={styles.appName}>cospira</Text>
            <Text style={styles.tagline}>All-in-one connection hub.</Text>
          </View>

          <View style={styles.content}>
            <Text style={styles.welcomeText}>Welcome back</Text>
            
            <PremiumInput 
              label="Email or Username" 
              value={email} 
              onChangeText={setEmail}
              icon="mail-outline"
              keyboardType="default"
              variant="dark"
            />
            
            <Animated.View style={{ transform: [{ translateX: shakeAnimation }] }}>
                <PremiumInput 
                label="Password" 
                value={password} 
                onChangeText={setPassword}
                icon="lock-closed-outline"
                rightIcon={showPassword ? "eye-off-outline" : "eye-outline"}
                onRightIconPress={() => setShowPassword(!showPassword)}
                secureTextEntry={!showPassword}
                variant="dark"
                error={error}
                />
            </Animated.View>
            
            <TouchableOpacity 
              style={styles.forgotPasswordBtn}
              onPress={() => navigation.navigate('ForgotPassword')}
            >
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>

            <PremiumButton 
              title={loading ? "Logging in..." : "Log In"}
              onPress={handleLogin}
              loading={loading}
              variant="primary"
              icon="log-in-outline"
              fullWidth
              style={[styles.loginBtn, { borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }]}
            />

            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.divider} />
            </View>

            <View style={styles.socialContainer}>
              <SocialButton type="google" onPress={handleGoogleLogin} />
              <SocialButton type="facebook" onPress={() => console.log('Facebook Login')} />
            </View>

            <View style={styles.signupContainer}>
              <Text style={styles.noAccountText}>Don't have an account? </Text>
              <PressableScale onPress={() => navigation.navigate('Signup')}>
                <Text style={styles.signupLink}>Sign up</Text>
              </PressableScale>
            </View>

            <TouchableOpacity 
              style={styles.guestButton}
              onPress={async () => {
                await authStore.loginAsGuest();
              }}
            >
              <Text style={styles.guestButtonText}>Continue as Guest</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>

      <Modal
        animationType="fade"
        transparent={true}
        visible={showSignupModal}
        onRequestClose={() => setShowSignupModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
                <MaterialCommunityIcons name="account-plus" size={32} color="#3b82f6" />
            </View>
            <Text style={styles.modalTitle}>New Here?</Text>
            <Text style={styles.modalText}>
              This email isn't registered with us yet. Create an account to get started!
            </Text>
            
            <TouchableOpacity 
              style={styles.modalButtonPrimary}
              onPress={() => {
                setShowSignupModal(false);
                navigation.navigate('Signup');
              }}
            >
              <Text style={styles.modalButtonText}>Sign Up Now</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.modalButtonSecondary}
              onPress={() => setShowSignupModal(false)}
            >
              <Text style={styles.modalButtonTextSecondary}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={showLockoutModal}
        onRequestClose={() => setShowLockoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalIconContainer, { backgroundColor: '#fef2f2' }]}>
                <MaterialCommunityIcons name="shield-lock" size={32} color="#ef4444" />
            </View>
            <Text style={styles.modalTitle}>Security Lockout</Text>
            <Text style={styles.modalText}>
              {lockoutMessage || "Too many failed attempts. Please try again later."}
            </Text>
            
            <TouchableOpacity 
              style={styles.modalButtonPrimary}
              onPress={() => {
                setShowLockoutModal(false);
                navigation.navigate('ForgotPassword');
              }}
            >
              <Text style={styles.modalButtonText}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.modalButtonSecondary}
              onPress={() => setShowLockoutModal(false)}
            >
              <Text style={styles.modalButtonTextSecondary}>I'll Wait</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#000000',
    paddingHorizontal: 24,
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 16,
  },
  appName: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  tagline: {
    fontSize: 14,
    color: '#94a3b8',
  },
  content: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 24,
  },
  forgotPasswordBtn: {
    alignSelf: 'flex-end',
    marginBottom: 16,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  loginBtn: {
    marginBottom: 24,
  },
  forgotText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  passwordRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  separator: {
    width: 1,
    height: 16,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 10,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    paddingHorizontal: 12,
    fontSize: 12,
    color: '#94a3b8',
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 40,
  },
  noAccountText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  signupLink: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  guestButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: -20,
    marginBottom: 40,
  },
  guestButtonText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
  },
  modalContent: {
      backgroundColor: 'white',
      width: '85%',
      borderRadius: 24,
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
      backgroundColor: '#eff6ff',
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
  modalButtonPrimary: {
      backgroundColor: '#3b82f6',
      width: '100%',
      paddingVertical: 14,
      borderRadius: 16,
      alignItems: 'center',
      marginBottom: 12,
  },
  modalButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
  },
  modalButtonSecondary: {
      width: '100%',
      paddingVertical: 14,
      alignItems: 'center',
  },
  modalButtonTextSecondary: {
      color: '#64748b',
      fontSize: 16,
      fontWeight: '600',
  }
});

export default LoginScreen;
