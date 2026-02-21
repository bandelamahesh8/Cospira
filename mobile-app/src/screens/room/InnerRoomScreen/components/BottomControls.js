import React, { memo } from 'react';
import { View, TouchableOpacity, Text, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
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
}) => {
  const insets = useSafeAreaInsets();
  const bottomInset = Platform.OS === 'android' ? Math.max(insets.bottom, BOTTOM_SAFE_MIN) : insets.bottom;

  const handlePress = (fn) => () => {
    onInteraction?.();
    fn?.();
  };

  const absoluteStyle = [styles.bottomControlsAbsolute, { bottom: bottomInset }];
  const collapsedStyle = [styles.bottomControlsCollapsed, { bottom: bottomInset }];

  if (!visible) {
    return (
      <TouchableOpacity
        style={collapsedStyle}
        onPress={onShow}
        activeOpacity={0.9}
        accessible={true}
        accessibilityLabel="Show controls"
        accessibilityRole="button"
      >
        <Ionicons name="chevron-up" size={24} color={COLORS.gray[600]} />
        <Text style={styles.bottomControlsCollapsedText}>Tap for controls</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={absoluteStyle}>
      <View style={styles.bottomControls}>
        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={[styles.iconBtn, sfuVideoEnabled && styles.iconBtnActive]}
            onPress={handlePress(onToggleVideo)}
            accessible={true}
            accessibilityLabel={sfuVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
            accessibilityRole="button"
            accessibilityState={{ checked: sfuVideoEnabled }}
          >
            <Ionicons
              name={sfuVideoEnabled ? 'videocam-outline' : 'videocam-off-outline'}
              size={24}
              color={sfuVideoEnabled ? COLORS.success.main : COLORS.gray[500]}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconBtn} onPress={handlePress(onOpenChat)} accessible={true} accessibilityLabel="Open chat" accessibilityRole="button">
            <Ionicons name="chatbubble-outline" size={24} color={COLORS.gray[500]} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.micBtnLarge, sfuAudioEnabled && styles.micBtnActive]}
            onPress={handlePress(onToggleAudio)}
            accessible={true}
            accessibilityLabel={sfuAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
            accessibilityRole="button"
            accessibilityState={{ checked: sfuAudioEnabled }}
          >
            <Ionicons name={sfuAudioEnabled ? 'mic' : 'mic-off'} size={28} color={COLORS.text.inverse} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconBtn} onPress={handlePress(onOpenUpload)} accessible={true} accessibilityLabel="Share content" accessibilityRole="button">
            <Ionicons name="cloud-upload-outline" size={24} color={COLORS.gray[500]} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconBtn} onPress={handlePress(onOpenGames)} accessible={true} accessibilityLabel="Start game" accessibilityRole="button">
            <Ionicons name="game-controller-outline" size={24} color={COLORS.gray[500]} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default memo(BottomControls);
