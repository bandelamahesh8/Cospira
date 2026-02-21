import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Dimensions, KeyboardAvoidingView, Platform, Alert, Image, Animated } from 'react-native';
import { StatusBar } from 'react-native';
import { colors } from '../../core/theme/colors';
import { typography } from '../../core/theme/typography';
import { borderRadius } from '../../core/theme/borderRadius';
import PremiumInput from '../../components/inputs/PremiumInput';
import PremiumButton from '../../components/buttons/PremiumButton';
import SocialButton from '../../components/buttons/SocialButton';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { authService } from '../../services/auth.service';

const SignupScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [isUsernameAvailable, setIsUsernameAvailable] = useState(null); 
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [showRules, setShowRules] = useState(true);

  const rules = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  };

  const strengthCount = Object.values(rules).filter(Boolean).length;
  const strengthLabels = ['Weak', 'Fair', 'Good', 'Strong', 'Strong 👍'];
  const strengthColors = ['#ef4444', '#f59e0b', '#3b82f6', '#16a34a', '#16a34a'];

  useEffect(() => {
    if (username.length < 3) {
      setIsUsernameAvailable(null);
      setCheckingUsername(false);
      return;
    }

    setCheckingUsername(true);
    const timer = setTimeout(async () => {
      try {
        const result = await authService.checkUsernameAvailability(username);
        setIsUsernameAvailable(result.available);
      } catch (err) {
        console.error("Availability check failed:", err);
        setIsUsernameAvailable(null);
      } finally {
        setCheckingUsername(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [username]);

  const PasswordRule = ({ label, met }) => (
    <View style={styles.ruleItem}>
      <MaterialCommunityIcons 
        name={met ? "check" : "circle-outline"} 
        size={16} 
        color={met ? "#22c55e" : "#94a3b8"} 
      />
      <Text style={[styles.ruleText, met && styles.ruleTextMet]}>{label}</Text>
    </View>
  );

  const handleSignup = async () => {
    if (strengthCount < 4) return;
    setLoading(true);
    try {
      await authService.register(username, email, password);
      navigation.navigate('Login');
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
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
            <Text style={styles.trustText}>Trusted by 12,420 users</Text>
          </View>

          <View style={styles.content}>
            <Text style={styles.titleText}>Create your account</Text>
            
            <PremiumInput 
              label="Username" 
              value={username} 
              onChangeText={setUsername}
              icon="person-outline"
              variant="dark"
            />
            {username.length >= 3 && (
              <View style={styles.usernameStatus}>
                {checkingUsername ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={[styles.statusText, isUsernameAvailable && styles.statusAvailable]}>
                    {isUsernameAvailable ? '✓ Available' : '✕ Taken'}
                  </Text>
                )}
              </View>
            )}

            <PremiumInput 
              label="Email" 
              value={email} 
              onChangeText={setEmail}
              icon="mail-outline"
              keyboardType="email-address"
              variant="dark"
            />
            
            <PremiumInput 
              label="Password" 
              value={password} 
              onChangeText={setPassword}
              icon="lock-closed-outline"
              secureTextEntry={!showPassword}
              variant="dark"
            />

            <View style={styles.strengthSection}>
              <View style={styles.strengthBarContainer}>
                <View 
                  style={[
                    styles.strengthBar, 
                    { 
                      width: `${(strengthCount / 4) * 100}%`, 
                      backgroundColor: strengthColors[strengthCount] 
                    }
                  ]} 
                />
              </View>
              
              <View style={styles.strengthHeader}>
                <Text style={styles.strengthLabel}>
                  Strength: <Text style={[styles.strengthValue, { color: strengthColors[strengthCount] }]}>
                    {strengthLabels[strengthCount]}
                  </Text>
                </Text>
                <TouchableOpacity onPress={() => setShowRules(!showRules)}>
                  <Text style={styles.hideRulesText}>{showRules ? 'Hide rules' : 'Show rules'}</Text>
                </TouchableOpacity>
              </View>

              {showRules && (
                <View style={styles.rulesGrid}>
                  <PasswordRule label="8+ characters" met={rules.length} />
                  <PasswordRule label="Uppercase" met={rules.uppercase} />
                  <PasswordRule label="Number" met={rules.number} />
                  <PasswordRule label="Symbol" met={rules.symbol} />
                </View>
              )}
            </View>

            <PremiumButton 
              title={loading ? "Creating..." : "Create Account"}
              onPress={handleSignup}
              loading={loading}
              disabled={strengthCount < 4 || isUsernameAvailable === false}
              variant="gradient"
              icon="person-add-outline"
              fullWidth
              style={styles.createBtn}
            />

            <Text style={styles.subInfoText}>Takes less than 30 seconds • Free forever</Text>
            
            <View style={styles.policyContainer}>
              <Text style={styles.policyText}>By signing up, you agree to our </Text>
              <TouchableOpacity>
                <Text style={styles.policyLink}>Terms & Privacy Policy</Text>
              </TouchableOpacity>
              <Text style={styles.policyText}>.</Text>
            </View>

            <View style={styles.socialContainer}>
              <SocialButton type="google" style={styles.socialBtn} onPress={() => console.log('Google')} />
              <SocialButton type="facebook" style={styles.socialBtn} onPress={() => console.log('Facebook')} />
              <SocialButton type="apple" style={styles.socialBtn} onPress={() => console.log('Apple')} />
            </View>

            <View style={styles.loginContainer}>
              <Text style={styles.hasAccountText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.loginLink}>Log in</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
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
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 12,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  tagline: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 8,
  },
  trustText: {
    fontSize: 12,
    color: '#64748b',
  },
  content: {
    flex: 1,
  },
  titleText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 20,
  },
  usernameStatus: {
    marginTop: -8,
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  statusText: {
    fontSize: 12,
    color: colors.danger,
    fontWeight: '500',
  },
  statusAvailable: {
    color: colors.success,
  },
  availableBadge: {
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  availableText: {
    color: '#16a34a',
    fontSize: 12,
    fontWeight: '500',
  },
  takenBadge: {
    backgroundColor: '#fef2f2',
  },
  takenText: {
    color: '#ef4444',
  },
  strengthSection: {
    backgroundColor: colors.dark.surface,
    borderRadius: borderRadius.lg,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  strengthBarContainer: {
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    marginBottom: 12,
    overflow: 'hidden',
  },
  strengthBar: {
    height: '100%',
  },
  strengthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  strengthLabel: {
    fontSize: 12,
    color: '#94a3b8',
  },
  strengthValue: {
    color: '#16a34a',
    fontWeight: '600',
  },
  hideRulesText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  rulesGrid: {
    flexDirection: 'column',
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  ruleText: {
    fontSize: 12,
    color: '#94a3b8',
    marginLeft: 8,
  },
  ruleTextMet: {
    color: '#ffffff',
  },
  createBtn: {
    marginTop: 0,
    marginBottom: 12,
  },
  subInfoText: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 8,
  },
  policyContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginBottom: 24,
  },
  policyText: {
    fontSize: 12,
    color: '#64748b',
  },
  policyLink: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  socialBtn: {
    width: '31%',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 40,
  },
  hasAccountText: {
    color: '#64748b',
    fontSize: 14,
  },
  loginLink: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  }
});

export default SignupScreen;
