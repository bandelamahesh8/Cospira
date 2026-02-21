import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, TextInput, ScrollView, Platform, ActivityIndicator, StatusBar } from 'react-native';
import PressableScale from '../../components/animations/PressableScale';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import * as ImagePicker from 'react-native-image-picker';
// Removed top-level FileSystem import to prevent native module errors on web/unlinked environments
import { authStore } from '../../store/authStore';
import { authService } from '../../services/auth.service';

const DICEBEAR_STYLES = [
  'https://api.dicebear.com/9.x/micah/png?seed=Felix&backgroundColor=e0e7ff',
  'https://api.dicebear.com/9.x/avataaars/png?seed=Aneka&backgroundColor=ffdfbf',
  'https://api.dicebear.com/9.x/notionists/png?seed=Zack&backgroundColor=d1fae5',
  'https://api.dicebear.com/9.x/bottts-neutral/png?seed=Cospira&backgroundColor=f1f5f9',
  'https://api.dicebear.com/9.x/adventurer/png?seed=Midnight&backgroundColor=fee2e2',
  'https://api.dicebear.com/9.x/micah/png?seed=Sheba&backgroundColor=ffedd5',
  'https://api.dicebear.com/9.x/avataaars/png?seed=Jack&backgroundColor=cffafe',
  'https://api.dicebear.com/9.x/notionists/png?seed=Leo&backgroundColor=f3e8ff',
];

const EditProfileScreen = ({ navigation }) => {
  const [user, setUser] = useState(authStore.user || {});
  const [fullName, setFullName] = useState(user.name || user.username || '');
  const [username, setUsername] = useState(user.username || '');
  const [selectedAvatar, setSelectedAvatar] = useState(user.profileImage || DICEBEAR_STYLES[0]);
  const [saving, setSaving] = useState(false);
  
  const nameInputRef = useRef(null);
  const usernameInputRef = useRef(null);
  
  // Username Availability State
  const [isUsernameAvailable, setIsUsernameAvailable] = useState(true);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameMessage, setUsernameMessage] = useState('');

  // Debounce for username check
  useEffect(() => {
      const timer = setTimeout(async () => {
          if (!username || username === user.username) {
              setIsUsernameAvailable(true);
              setUsernameMessage('');
              return;
          }
          if (username.length < 3) {
              setIsUsernameAvailable(false);
              setUsernameMessage('Username must be at least 3 characters');
              return;
          }

          setIsCheckingUsername(true);
          try {
              const response = await authService.checkUsernameAvailability(username);
              const available = response?.available || response?.isAvailable || response?.data?.available; 
              
              if (available) {
                  setIsUsernameAvailable(true);
                  setUsernameMessage('Username is available');
              } else {
                  setIsUsernameAvailable(false);
                  setUsernameMessage('Username is already taken');
              }
          } catch (error) {
              console.log('Error checking username:', error);
              setUsernameMessage('Could not verify username availability');
          } finally {
              setIsCheckingUsername(false);
          }
      }, 500); // 500ms debounce

      return () => clearTimeout(timer);
  }, [username, user.username]);

  const handleUploadCustom = async () => {
    try {
        const options = {
            mediaType: 'photo',
            includeBase64: true,
            quality: 0.5,
        };

        ImagePicker.launchImageLibrary(options, (response) => {
            if (response.didCancel) {
                console.log('User cancelled image picker');
            } else if (response.errorCode) {
                console.log('ImagePicker Error: ', response.errorMessage);
                alert('ImagePicker Error: ' + response.errorMessage);
            } else if (response.assets && response.assets.length > 0) {
                 const asset = response.assets[0];
                 const imageUri = `data:${asset.type};base64,${asset.base64}`;
                 setSelectedAvatar(imageUri);
            }
        });
    } catch (error) {
        console.log('Error picking image:', error);
        alert('Failed to pick image');
    }
  };

  const handleSave = async () => {
    if (!isUsernameAvailable && username !== user.username) {
        alert('Please choose a valid available username');
        return;
    }
    
    setSaving(true);
    try {
        const updates = {
            name: fullName,
            username: username,
            profileImage: selectedAvatar
        };
        
        // 1. API Call
        const response = await authService.updateProfile(updates);

        if (response?.success || response?.user || response?.data) {
            // 2. Update Local Store
            const responseUser = response.user || response.data?.user || response.data || response;
            const updatedUser = { ...user, ...updates, ...responseUser };
            
            authStore.user = updatedUser; 
            authStore.notify(); 
            
            navigation.goBack();
        } else {
            console.log('Update failed, response:', response);
            alert('Failed to update profile');
        }
    } catch (error) {
        console.error('Profile update failed:', error);
        alert(error.message || 'Error saving changes');
    } finally {
        setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Background Effect */}
      <LinearGradient
        colors={['#fdf4ff', '#f0f9ff', '#ffffff']}
        style={styles.background}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        
        <View style={styles.headerTitleContainer}>
            <Image source={require('../../../assets/images/logo.png')} style={styles.headerLogo} resizeMode="contain" />
            <Text style={styles.headerTitle}>cospira</Text>
        </View>

        <PressableScale 
            style={[styles.saveButton, (saving || (!isUsernameAvailable && username !== user.username)) && { opacity: 0.7 }]} 
            onPress={handleSave}
            disabled={saving || (!isUsernameAvailable && username !== user.username)}
        >
            <LinearGradient
                colors={['#a855f7', '#8b5cf6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveBtnGradient}
            >
                <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
            </LinearGradient>
        </PressableScale>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.titleSection}>
            <Text style={styles.screenTitle}>Edit Profile</Text>
            <Text style={styles.screenSubtitle}>Customize your personal sector.</Text>
        </View>

        {/* Avatar Section */}
        <View style={styles.avatarSection}>
            <View style={styles.avatarWrapper}>
                <LinearGradient
                    colors={['#a855f7', '#3b82f6']}
                    style={styles.avatarRing}
                >
                    <Image source={{ uri: selectedAvatar }} style={styles.avatarImage} />
                </LinearGradient>
                <TouchableOpacity style={styles.cameraBtn} onPress={handleUploadCustom}>
                    <Ionicons name="camera" size={18} color="#fff" />
                </TouchableOpacity>
            </View>
            <Text style={styles.previewName}>{fullName || 'Your Name'}</Text>
            <Text style={styles.previewHandle}>@{username || 'username'}</Text>
        </View>

        {/* Form Fields */}
        <View style={styles.formSection}>
            <Text style={styles.label}>FULL NAME</Text>
            <View style={styles.inputContainer}>
                <TextInput 
                    ref={nameInputRef}
                    style={styles.input}
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="Enter full name"
                    placeholderTextColor="#94a3b8"
                />
                <TouchableOpacity onPress={() => nameInputRef.current?.focus()}>
                    <Text style={styles.inlineActionText}>Edit</Text>
                </TouchableOpacity>
            </View>

            <Text style={styles.label}>USERNAME</Text>
            <View style={[styles.inputContainer, !isUsernameAvailable && username !== user.username && styles.inputError]}>
                <Ionicons name="at-outline" size={18} color="#64748b" style={styles.inputIcon} />
                <TextInput 
                    ref={usernameInputRef}
                    style={[styles.input]}
                    value={username}
                    onChangeText={(text) => setUsername(text.toLowerCase().replace(/\s/g, ''))}
                    placeholder="username"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="none"
                />
                
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {isCheckingUsername ? (
                        <ActivityIndicator size="small" color="#a855f7" />
                    ) : (
                        username !== user.username && (
                            <Ionicons 
                                name={isUsernameAvailable ? "checkmark-circle" : "alert-circle"} 
                                size={20} 
                                color={isUsernameAvailable ? "#22c55e" : "#ef4444"} 
                            />
                        )
                    )}
                    <TouchableOpacity onPress={() => usernameInputRef.current?.focus()}>
                        <Text style={styles.inlineActionText}>Change</Text>
                    </TouchableOpacity>
                </View>
            </View>
            {usernameMessage && username !== user.username ? (
                <Text style={[
                    styles.validationMessage, 
                    isUsernameAvailable ? styles.textSuccess : styles.textError
                ]}>
                    {usernameMessage}
                </Text>
            ) : null}
        </View>

        {/* Avatar Selector */}
        <View style={styles.presetSection}>
            <View style={styles.presetHeader}>
                <Text style={styles.presetLabel}>PROFILE PICTURE</Text>
                <Text style={styles.subLabel}>NEURAL PRESETS</Text>
            </View>
        </View>

        <View style={styles.gridContainer}>
            {DICEBEAR_STYLES.map((uri, index) => (
                <PressableScale 
                    key={index} 
                    style={[
                        styles.gridItem,
                        selectedAvatar === uri && styles.selectedGridItem
                    ]}
                    onPress={() => setSelectedAvatar(uri)}
                    scaleTo={0.92}
                >
                    <Image source={{ uri }} style={styles.gridImage} />
                    {selectedAvatar === uri && (
                        <View style={styles.selectedOverlay}>
                             <Ionicons name="checkmark-circle" size={24} color="#a855f7" />
                        </View>
                    )}
                </PressableScale>
            ))}
        </View>

        <PressableScale style={styles.uploadBtn} onPress={handleUploadCustom}>
             <LinearGradient
                colors={['#e0e7ff', '#f3e8ff']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.uploadBtnGradient}
            >
                <Ionicons name="cloud-upload-outline" size={20} color="#4f46e5" style={{ marginRight: 8 }} />
                <Text style={styles.uploadText}>Upload Custom</Text>
            </LinearGradient>
        </PressableScale>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '100%',
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
  saveButton: {
      borderRadius: 20,
      overflow: 'hidden',
  },
  saveBtnGradient: {
      paddingHorizontal: 16,
      paddingVertical: 8,
  },
  saveBtnText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 13,
  },
  scrollContent: {
      paddingHorizontal: 24,
      paddingTop: 20,
  },
  titleSection: {
      alignItems: 'center',
      marginBottom: 32,
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
  avatarSection: {
      alignItems: 'center',
      marginBottom: 32,
  },
  avatarWrapper: {
      position: 'relative',
      marginBottom: 16,
  },
  avatarRing: {
      width: 108,
      height: 108,
      borderRadius: 54,
      padding: 3,
      justifyContent: 'center',
      alignItems: 'center',
  },
  avatarImage: {
      width: 96,
      height: 96,
      borderRadius: 48,
      borderWidth: 3,
      borderColor: '#fff',
  },
  cameraBtn: {
      position: 'absolute',
      bottom: 4,
      right: 4,
      backgroundColor: '#3b82f6',
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: '#fff',
  },
  previewName: {
      fontSize: 20,
      fontWeight: '700',
      color: '#1e293b',
  },
  previewHandle: {
      fontSize: 14,
      color: '#64748b',
      marginTop: 2,
  },
  formSection: {
      marginBottom: 32,
      gap: 6,
  },
  label: {
      fontSize: 11,
      fontWeight: '700',
      color: '#94a3b8',
      letterSpacing: 1,
      marginBottom: 4,
      marginTop: 12,
  },
  inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#f1f5f9', // Slightly darker than white
      borderRadius: 16,
      borderWidth: 1,
      borderColor: '#e2e8f0',
      height: 52,
      paddingHorizontal: 16,
  },
  inputError: {
      borderColor: '#ef4444',
      backgroundColor: '#fef2f2',
  },
  input: {
      flex: 1,
      fontSize: 15,
      fontWeight: '500',
      color: '#1e293b',
  },
  inputIcon: {
      marginRight: 10,
  },
  validationMessage: {
      fontSize: 12,
      marginTop: 6,
      marginLeft: 4,
      fontWeight: '600',
  },
  textSuccess: {
      color: '#22c55e',
  },
  textError: {
      color: '#ef4444',
  },
  presetSection: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      marginBottom: 16,
  },
  presetLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: '#94a3b8',
      letterSpacing: 1,
  },
  subLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: '#64748b',
      marginTop: 4,
  },
  gridContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 24,
  },
  gridItem: {
      width: '22%',
      aspectRatio: 1,
      borderRadius: 16,
      overflow: 'hidden',
      backgroundColor: '#f1f5f9',
  },
  selectedGridItem: {
      borderWidth: 2,
      borderColor: '#a855f7',
  },
  gridImage: {
      width: '100%',
      height: '100%',
  },
  selectedOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(255,255,255,0.3)',
      justifyContent: 'center',
      alignItems: 'center',
  },
  uploadBtn: {
      borderRadius: 20,
      overflow: 'hidden',
      marginBottom: 20,
  },
  uploadBtnGradient: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 16,
      borderWidth: 1,
      borderColor: '#fff',
  },
  uploadText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#4f46e5',
  },
  inlineActionText: {
      color: '#3b82f6',
      fontWeight: '600',
      fontSize: 13,
      marginLeft: 4,
  }
});

export default EditProfileScreen;
