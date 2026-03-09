import React, { memo, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, Easing, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { BlurView } from '@react-native-community/blur';
import { headerStyles as styles, COLORS } from '../styles/InnerRoomScreen.styles';

const Header = ({
  roomId,
  isConnected,
  isOnline,
  participantCount,
  isHost,
  onCopyRoomCode,
  onOpenSettings,
  onOpenParticipants,
  onOpenLeaderboard,
  onLeave,
  isDark,
}) => {
  const signalColor = isConnected && isOnline ? COLORS.success.main : COLORS.error.main;

  // Pulse animation for LIVE badge
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.5,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const blurType = isDark ? 'dark' : 'light';
  const bgColor = isDark ? 'rgba(15, 23, 42, 0.5)' : 'rgba(255, 255, 255, 0.5)';
  const borderColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
  const iconColor = isDark ? '#fff' : COLORS.gray[800];
  const textColor = isDark ? '#fff' : COLORS.text.primary;

  return (
    <View style={[styles.header, { borderBottomColor: borderColor }]}>
      <BlurView
        style={StyleSheet.absoluteFill}
        blurType={blurType}
        blurAmount={20}
        reducedTransparencyFallbackColor={isDark ? '#0f172a' : '#ffffff'}
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: bgColor }]} />

      {/* Left: LIVE Status + Signal */}
      <View style={styles.headerLeft}>
        <View style={styles.liveBadgeWrapper}>
          <Animated.View style={[styles.liveBadge, { opacity: pulseAnim }]}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </Animated.View>
        </View>
        <TouchableOpacity style={styles.signalIndicator}>
          <Ionicons
            name="cellular"
            size={14}
            color={signalColor}
          />
        </TouchableOpacity>
      </View>

      {/* Center: Room Code + Settings */}
      <View style={styles.headerCenter}>
        <TouchableOpacity
          onPress={onCopyRoomCode}
          style={styles.roomCodeContainer}
        >
          <Text style={styles.roomCodePrefix}>ID</Text>
          <Text style={[styles.roomCodeText, { color: textColor }]}>{roomId || 'V5GNB5'}</Text>
          <Ionicons name="copy-outline" size={10} color={isDark ? COLORS.gray[400] : COLORS.gray[600]} style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      </View>

      {/* Right: Participants + Leave */}
      <View style={styles.headerRight}>
        <TouchableOpacity
          style={styles.headerActionPill}
          onPress={onOpenParticipants}
        >
          <View style={styles.participantPillInner}>
            <Ionicons name="people" size={14} color={iconColor} />
            <Text style={[styles.headerPillText, { color: textColor }]}>{participantCount}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerActionCircle}
          onPress={onOpenSettings}
        >
          <Ionicons name="settings-sharp" size={18} color={iconColor} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.headerActionCircle, { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.3)' }]}
          onPress={onLeave}
        >
          <Ionicons
            name={isHost ? 'close-circle' : 'log-out'}
            size={20}
            color={COLORS.error.main}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default memo(Header);
