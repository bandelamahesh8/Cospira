import React, { memo, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, Text } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import ParticipantTile from './ParticipantTile';
import { styles, COLORS } from '../styles/InnerRoomScreen.styles';
import { authStore } from '../../../../store/authStore';

const TILE_WIDTH = 88;
const TILE_HEIGHT = 112;

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
    <View style={stripStyles.container}>
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
            />
            <View style={stripStyles.badges}>
              {p.isHost && (
                <View style={stripStyles.badgeHost}>
                  <Ionicons name="star" size={10} color="#fff" />
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

const stripStyles = {
  container: {
    height: TILE_HEIGHT + 24,
    paddingVertical: 8,
    paddingHorizontal: 4,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  scrollContent: {
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tileWrap: {
    width: TILE_WIDTH,
    height: TILE_HEIGHT,
    marginRight: 8,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  badges: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  badgeHost: {
    backgroundColor: COLORS.primary.main,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeCoHost: {
    backgroundColor: COLORS.success.main,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeCoHostText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  pinBtn: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 4,
    borderRadius: 6,
  },
  pinBtnActive: {
    backgroundColor: COLORS.primary.main,
  },
};

export default memo(ParticipantStrip);
