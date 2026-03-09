import React, { memo, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { BlurView } from '@react-native-community/blur';
import ParticipantTile from './ParticipantTile';
import { COLORS } from '../styles/InnerRoomScreen.styles';
import { authStore } from '../../../../store/authStore';

const TILE_WIDTH = 96;
const TILE_HEIGHT = 120;

const ParticipantStrip = ({
  users = [],
  hostId,
  coHostIds = [],
  pinnedIds = [],
  onTogglePin,
  localStream,
  remoteStreams,
  sfuJoined,
  sfuVideoEnabled,
  sfuAudioEnabled,
  sfuCameraType,
  onSwitchCamera,
  isDark = true,
}) => {
  const currentUserId = authStore.user?.id;

  const orderedParticipants = useMemo(() => {
    const self = {
      id: 'local',
      userId: currentUserId,
      name: (authStore.user?.name || authStore.user?.username || 'You') + ' (Me)',
      avatar: authStore.user?.avatar || authStore.user?.profile_picture,
      stream: localStream,
      isLocal: true,
      isHost: currentUserId === hostId,
      isCoHost: Array.isArray(coHostIds) && coHostIds.includes(currentUserId),
      isPinned: pinnedIds.includes(currentUserId),
      hasVideo: sfuVideoEnabled,
    };

    const remotes = (users || []).map((user) => {
      const stream = remoteStreams instanceof Map ? remoteStreams.get(user.id) : remoteStreams?.[user.id];
      const hasVideo = !!(stream && (stream.getVideoTracks?.()?.some?.(t => t.enabled) ?? stream.toURL));
      return {
        id: user.id,
        userId: user.id,
        name: user.name || user.username || `User ${(user.id || '').slice(0, 6)}`,
        avatar: user.avatar || user.profile_picture || user.profilePicture,
        stream,
        isLocal: false,
        isHost: user.id === hostId,
        isCoHost: Array.isArray(coHostIds) && coHostIds.includes(user.id),
        isPinned: pinnedIds.includes(user.id),
        hasVideo,
      };
    });

    const pinned = remotes.filter((p) => p.isPinned);
    const withVideo = remotes.filter((p) => !p.isPinned && p.hasVideo);
    const rest = remotes.filter((p) => !p.isPinned && !p.hasVideo);
    const sortedOthers = [...pinned, ...withVideo, ...rest];

    return [self, ...sortedOthers];
  }, [
    users,
    hostId,
    coHostIds,
    pinnedIds,
    currentUserId,
    localStream,
    remoteStreams,
    sfuVideoEnabled,
  ]);

  if (!sfuJoined || orderedParticipants.length === 0) return null;

  return (
    <View style={stripStyles.containerWrapper}>
      <BlurView
        style={StyleSheet.absoluteFill}
        blurType={isDark ? "dark" : "light"}
        blurAmount={15}
        reducedTransparencyFallbackColor={isDark ? '#0f172a' : '#f8fafc'}
      />
      <View style={[stripStyles.overlayFill, { backgroundColor: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.4)' }]} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={stripStyles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {orderedParticipants.map((p) => (
          <View key={p.id} style={stripStyles.tileWrap}>
            <ParticipantTile
              id={p.id}
              name={p.name}
              avatar={p.avatar}
              stream={p.stream}
              isLocal={p.isLocal}
              isPip={true}
              tileWidth={TILE_WIDTH}
              tileHeight={TILE_HEIGHT}
              sfuVideoEnabled={p.isLocal ? sfuVideoEnabled : !!p.stream}
              sfuAudioEnabled={sfuAudioEnabled}
              sfuCameraType={sfuCameraType}
              onSwitchCamera={onSwitchCamera}
              isDark={isDark}
            />
            <View style={stripStyles.badges}>
              {p.isHost && (
                <View style={stripStyles.badgeHost}>
                  <Ionicons name="star" size={12} color="#fff" />
                </View>
              )}
              {p.isCoHost && !p.isHost && (
                <View style={stripStyles.badgeCoHost}>
                  <Text style={stripStyles.badgeCoHostText}>Co</Text>
                </View>
              )}
              {onTogglePin && (
                <TouchableOpacity
                  style={[stripStyles.pinBtn, p.isPinned && stripStyles.pinBtnActive]}
                  onPress={() => onTogglePin(p.userId || p.id)}
                  activeOpacity={0.8}
                >
                  <Ionicons name={p.isPinned ? 'pin' : 'pin-outline'} size={14} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const stripStyles = StyleSheet.create({
  containerWrapper: {
    height: TILE_HEIGHT + 32,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  overlayFill: {
    ...StyleSheet.absoluteFillObject,
  },
  scrollContent: {
    paddingHorizontal: 12,
    alignItems: 'center',
    paddingVertical: 16,
  },
  tileWrap: {
    width: TILE_WIDTH,
    height: TILE_HEIGHT,
    marginRight: 12,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  badges: {
    position: 'absolute',
    top: 6,
    left: 6,
    right: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  badgeHost: {
    backgroundColor: COLORS.primary.main,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  badgeCoHost: {
    backgroundColor: COLORS.success.main,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeCoHostText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  pinBtn: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  pinBtnActive: {
    backgroundColor: COLORS.primary.main,
    borderColor: COLORS.primary.light,
  },
});

export default memo(ParticipantStrip);
