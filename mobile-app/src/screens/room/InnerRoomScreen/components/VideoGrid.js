import React, { memo, useMemo, useRef } from 'react';
import { View, ScrollView, ActivityIndicator, Text } from 'react-native';
import { MediaStream } from 'react-native-webrtc';
import ParticipantTile from './ParticipantTile';
import { styles, COLORS } from '../styles/InnerRoomScreen.styles';
import { useVideoLayout } from '../hooks/useVideoLayout';
import { authStore } from '../../../../store/authStore';

const VideoGrid = ({
  sfuJoined,
  localStream,
  remoteStreams,
  users,
  containerDimensions,
  sfuVideoEnabled,
  sfuAudioEnabled,
  sfuCameraType,
  onSwitchCamera,
  isPip = false,
}) => {
  const { calculateGridLayout } = useVideoLayout();

  // Cache video-only MediaStreams per participant so RTCView doesn't receive a new
  // streamURL on every re-render (which can cause black/stuck video on Android).
  const videoOnlyCacheRef = useRef(new Map()); // key -> { trackId: string, stream: MediaStream }

  const getVideoOnlyStream = (key, raw) => {
    if (!raw || typeof raw.getVideoTracks !== 'function') return raw || null;
    const vt = raw.getVideoTracks() || [];
    if (vt.length === 0) return raw;
    const trackId = vt[0]?.id || 'track';

    const cached = videoOnlyCacheRef.current.get(String(key));
    if (cached && cached.trackId === trackId && cached.stream) {
      return cached.stream;
    }

    const stream = new MediaStream(vt);
    videoOnlyCacheRef.current.set(String(key), { trackId, stream });
    return stream;
  };

  // Combine participants
  // For local: pass VIDEO-ONLY stream to RTCView to avoid crashes when stream has both video+audio.
  // react-native-webrtc RTCView can misbehave with multi-track streams; video-only is safer.
  const localDisplayStream = useMemo(() => {
    return getVideoOnlyStream('local', localStream);
  }, [localStream]);

  const participants = useMemo(() => {
    if (isPip) {
        // In PIP we usually only show local video or the active speaker
         return [{ 
             id: 'local', 
             name: 'Me', 
             stream: localDisplayStream, 
             isLocal: true 
        }];
    }

      // Filter out current user from remote list just in case
      const filteredUsers = users;

      const remoteParticipants = filteredUsers.map((user) => {
        // remoteStreams is a Map from useSFU
        const raw = remoteStreams instanceof Map ? remoteStreams.get(user.id) : remoteStreams[user.id];
        // Pass VIDEO-ONLY stream to RTCView to avoid crashes with video+audio streams.
        // IMPORTANT: reuse cached stream per video track to avoid URL churn.
        const stream = getVideoOnlyStream(user.id, raw);

        return {
          id: user.id,
          name: user.name || `User ${user.id.slice(0, 4)}`,
          avatar: user.avatar || user.profile_picture || user.profilePicture || user.photo || user.picture,
          stream,
          isLocal: false,
          status: {
             videoEnabled: user.videoEnabled ?? user.isVideoOn ?? (user.video !== false),
             audioEnabled: user.audioEnabled ?? (user.isMuted ? false : true)
          }
        };
      });

    return [
      { 
          id: 'local', 
          name: (authStore.user?.name || authStore.user?.username || 'You') + ' (Me)', 
          avatar: authStore.user?.avatar || authStore.user?.profile_picture || authStore.user?.profilePicture || authStore.user?.photo || authStore.user?.picture,
          stream: localDisplayStream, 
          isLocal: true 
      },
      ...remoteParticipants,
    ];
  }, [localDisplayStream, remoteStreams, users, isPip]);

  if (!sfuJoined && !isPip) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary.main} />
        <Text style={styles.waitingText}>Initializing Secure Session...</Text>
      </View>
    );
  }

  if (participants.length === 0) return null;
  
  // If PIP, just render the single tile
  if (isPip) {
      const p = participants[0];
       return (
          <ParticipantTile
            id={p.id}
            name={p.name}
            avatar={p.avatar}
            stream={p.stream}
            isLocal={p.isLocal}
            isPip={true}
            sfuVideoEnabled={sfuVideoEnabled}
            sfuAudioEnabled={sfuAudioEnabled}
            sfuCameraType={sfuCameraType}
            onSwitchCamera={onSwitchCamera}
            tileWidth="100%"
            tileHeight="100%"
          />
       );
  }

  // Pagination: Max 9 per page
  const pageSize = 9;
  const pages = [];
  for (let i = 0; i < participants.length; i += pageSize) {
    pages.push(participants.slice(i, i + pageSize));
  }
  
  // If only one user total (local)
  const isSingle = participants.length === 1;

  return (
    <ScrollView
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      style={{ flex: 1 }}
      contentContainerStyle={{ alignItems: 'center' }}
    >
      {pages.map((pageParticipants, pageIndex) => {
        const count = pageParticipants.length;
        const { cols, rows, tileWidth, tileHeight } = calculateGridLayout(count);
        
        // Override dimensions for grid container
        const gridWidth = containerDimensions?.width || '100%';
        const gridHeight = containerDimensions?.height || '100%';

        return (
          <View
            key={pageIndex}
            style={{
              width: gridWidth,
              height: gridHeight,
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 4,
            }}
          >
            {pageParticipants.map((p) => (
              <React.Fragment key={p.id}>
                <ParticipantTile
                  id={p.id}
                  name={p.name}
                  avatar={p.avatar}
                  stream={p.stream}
                  isLocal={p.isLocal}
                  isPip={false}
                  isSingle={isSingle}
                  tileWidth={tileWidth}
                  tileHeight={tileHeight}
                  sfuVideoEnabled={sfuVideoEnabled}
                  sfuAudioEnabled={sfuAudioEnabled}
                  sfuCameraType={sfuCameraType}
                  onSwitchCamera={onSwitchCamera}
                  remoteStatus={p.status}
                />
              </React.Fragment>
            ))}
          </View>
        );
      })}
    </ScrollView>
  );
};

export default memo(VideoGrid);
