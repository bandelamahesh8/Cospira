import React, { memo, useEffect, useRef } from 'react';
import { View, TouchableOpacity, Text, Platform, Animated, Easing, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { BlurView } from '@react-native-community/blur';
import { styles, COLORS } from '../styles/InnerRoomScreen.styles';

const BOTTOM_SAFE_MIN = 12;

const BottomControls = ({
  visible = true,
  onShow,
  onInteraction,
  keepVisible,
  sfuVideoEnabled,
  sfuAudioEnabled,
  onToggleVideo,
  onToggleAudio,
  onOpenChat,
  onOpenUpload,
  onOpenGames,
  isDark,
}) => {
  const insets = useSafeAreaInsets();
  const bottomInset = Platform.OS === 'android' ? Math.max(insets.bottom, BOTTOM_SAFE_MIN) : insets.bottom;

  // Entrance animation for controls
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 20,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handlePress = (fn) => () => {
    onInteraction?.();
    fn?.();
  };

  const blurType = isDark ? 'dark' : 'light';
  const bgColor = isDark ? 'rgba(15, 23, 42, 0.5)' : 'rgba(255, 255, 255, 0.5)';
  const borderColor = isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.2)';

  if (!visible) {
    return (
      <TouchableOpacity
        style={[
            styles.bottomControlsCollapsed, 
            { bottom: bottomInset + 20, backgroundColor: isDark ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.9)' },
            { borderColor: borderColor }
        ]}
        onPress={onShow}
        activeOpacity={0.9}
      >
        <Ionicons name="chevron-up" size={20} color={isDark ? "#fff" : COLORS.gray[600]} />
        <Text style={[styles.bottomControlsCollapsedText, { color: isDark ? "#fff" : COLORS.gray[600] }]}>TAP FOR CONTROLS</Text>
      </TouchableOpacity>
    );
  }

  const animatedStyle = {
    opacity: fadeAnim,
    transform: [{ translateY: slideAnim }],
  };

  return (
    <Animated.View style={[styles.bottomControlsAbsolute, { bottom: bottomInset + 20 }, animatedStyle]}>
      <View 
        style={[
          styles.floatingControlsContainer, 
          { 
            borderColor: borderColor,
            backgroundColor: Platform.OS === 'android' ? (isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.98)') : 'transparent'
          }
        ]}
      >
        {Platform.OS === 'ios' && (
          <View style={[StyleSheet.absoluteFill, { borderRadius: 40, overflow: 'hidden' }]}>
            <BlurView
              style={StyleSheet.absoluteFill}
              blurType={blurType}
              blurAmount={20}
              reducedTransparencyFallbackColor={isDark ? '#0f172a' : '#ffffff'}
            />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: bgColor }]} />
          </View>
        )}
        
        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={[styles.glassBtn, sfuVideoEnabled && styles.glassBtnActive]}
            onPress={handlePress(onToggleVideo)}
          >
            <Ionicons
              name={sfuVideoEnabled ? 'videocam' : 'videocam-off'}
              size={22}
              color={sfuVideoEnabled ? '#fff' : (isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)')}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.glassBtn} onPress={handlePress(onOpenChat)}>
            <Ionicons name="chatbubbles-sharp" size={22} color={isDark ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.7)"} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.micBtnPremium, sfuAudioEnabled && styles.micBtnPremiumActive]}
            onPress={handlePress(onToggleAudio)}
          >
            <Ionicons name={sfuAudioEnabled ? 'mic-sharp' : 'mic-off-sharp'} size={28} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.glassBtn} onPress={handlePress(onOpenUpload)}>
            <Ionicons name="share-social-sharp" size={22} color={isDark ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.7)"} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.glassBtn} onPress={handlePress(onOpenGames)}>
            <Ionicons name="game-controller" size={22} color={isDark ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.7)"} />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

export default memo(BottomControls);
