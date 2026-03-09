import React, { memo, useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Image, NativeModules, Animated, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
// import { Camera, useCameraDevice } from 'react-native-vision-camera';
import { styles, COLORS } from '../styles/InnerRoomScreen.styles';
import { authStore } from '../../../../store/authStore';

// Import RTCView directly from react-native-webrtc (not via polyfills)
// This ensures we get the real native component when available
let NativeRTCView = null;
const hasNativeWebRTC = !!NativeModules.WebRTCModule;

if (hasNativeWebRTC) {
  try {
    const webrtcModule = require('react-native-webrtc');
    NativeRTCView = webrtcModule.RTCView;
    console.log('[ParticipantTile] RTCView loaded from react-native-webrtc:', !!NativeRTCView, typeof NativeRTCView);
  } catch (e) {
    console.warn('[ParticipantTile] Failed to import RTCView from react-native-webrtc:', e.message);
  }
}

// Safe component wrappers to prevent "invalid element type" crashes in different environments
// SafeCameraView removed - using SafeRTCView for local preview as well
// to avoid hardware conflict between VisionCamera and WebRTC on Android.

const SafeRTCView = ({ streamURL, style, objectFit, mirror, zOrder, zOrderMediaOverlay }) => {
  // Only use native RTCView - never use a mock that renders null
  if (NativeRTCView) {
    return (
      <NativeRTCView 
        streamURL={streamURL} 
        style={style} 
        objectFit={objectFit || 'cover'} 
        mirror={mirror || false} 
        zOrder={zOrder ?? 0} 
        zOrderMediaOverlay={zOrderMediaOverlay || false}
      />
    );
  }
  
  // Fallback: show a placeholder indicating RTCView is unavailable
  console.warn('[SafeRTCView] NativeRTCView not available, showing fallback');
  return (
    <View style={[style, { backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center' }]}>
      <Ionicons name="videocam-outline" size={32} color="#555" />
      <Text style={{ color: '#555', fontSize: 10, marginTop: 4 }}>Stream unavailable</Text>
    </View>
  );
};


const ParticipantTile = ({
  id,
  name,
  avatar,
  stream,
  isLocal = false,
  isPip = false,
  tileWidth = '100%',
  tileHeight = '100%',
  isSingle = false,
  sfuVideoEnabled,
  sfuAudioEnabled,
  sfuCameraType,
  onSwitchCamera,
  remoteStatus,
  isDark,
}) => {
  // --- Remote media state detection (more defensive) ---
  let remoteHasVideo = false;
  let remoteHasAudio = false;

  if (stream && typeof stream.getVideoTracks === 'function') {
    const videoTracks = stream.getVideoTracks();
    const firstVideo = videoTracks[0];
    // For remote: show video whenever we have a non-ended track (muted or not).
    // When mobile starts its camera, the web's track can briefly mute; keep RTCView mounted to avoid black screen.
    const notEnded = firstVideo && firstVideo.readyState !== 'ended';
    remoteHasVideo =
      typeof stream.toURL === 'function' &&
      !!firstVideo &&
      notEnded;
  }

  if (stream && typeof stream.getAudioTracks === 'function') {
    const audioTracks = stream.getAudioTracks();
    const firstAudio = audioTracks[0];
    remoteHasAudio =
      (!remoteStatus || remoteStatus.audioEnabled !== false) &&
      !!firstAudio &&
      (firstAudio.readyState === undefined || firstAudio.readyState === 'live');
  }

  const hasVideo = isLocal ? sfuVideoEnabled : (remoteStatus ? (remoteStatus.videoEnabled !== false) : remoteHasVideo);
  const hasAudio = isLocal ? sfuAudioEnabled : (remoteStatus ? (remoteStatus.audioEnabled !== false) : remoteHasAudio);

  // Debug logging (only on mount and when stream changes)
  useEffect(() => {
    if (isLocal) {
      console.log('[ParticipantTile][LOCAL] Render State:', {
        hasStream: !!stream,
        streamURL: stream && typeof stream.toURL === 'function' ? stream.toURL() : 'N/A',
        sfuVideoEnabled,
        hasVideo,
        hasNativeWebRTC,
        hasNativeRTCView: !!NativeRTCView,
        videoTracks: stream?.getVideoTracks?.()?.length || 0,
        audioTracks: stream?.getAudioTracks?.()?.length || 0,
      });
    } else {
      console.log(`[ParticipantTile][REMOTE:${id?.slice(0,6)}] Render State:`, {
        hasStream: !!stream,
        streamURL: stream && typeof stream.toURL === 'function' ? stream.toURL() : 'N/A',
        hasVideo: remoteHasVideo,
        videoTracks: stream?.getVideoTracks?.()?.length || 0,
        audioTracks: stream?.getAudioTracks?.()?.length || 0,
      });
    }
  }, [stream, sfuVideoEnabled, isLocal]);

  // Track lifecycle monitoring: force re-render when tracks change state
  const [streamReady, setStreamReady] = useState(0);
  useEffect(() => {
    if (!stream || !stream.getTracks) return;
    
    const tracks = stream.getTracks();
    const handlers = [];
    
    tracks.forEach(track => {
      // Hardware safety: ensure track is enabled and NOT ended
      if (track.enabled === false) track.enabled = true;

      const onEnded = () => {
        console.log(`[ParticipantTile] Track ${track.kind} ended for ${isLocal ? 'local' : id}`);
        setStreamReady(prev => prev + 1);
      };
      const onMute = () => {
        console.log(`[ParticipantTile] Track ${track.kind} muted for ${isLocal ? 'local' : id}`);
        // REMOVED: setStreamReady(prev => prev + 1); 
        // Do NOT remount on mute/unmute - this crashes hardware during network jitter
      };
      const onUnmute = () => {
        console.log(`[ParticipantTile] Track ${track.kind} unmuted for ${isLocal ? 'local' : id}`);
        // REMOVED: setStreamReady(prev => prev + 1);
      };
      
      track.addEventListener('ended', onEnded);
      track.addEventListener('mute', onMute);
      track.addEventListener('unmute', onUnmute);
      handlers.push({ track, onEnded, onMute, onUnmute });
    });
    
    return () => {
      handlers.forEach(({ track, onEnded, onMute, onUnmute }) => {
        track.removeEventListener('ended', onEnded);
        track.removeEventListener('mute', onMute);
        track.removeEventListener('unmute', onUnmute);
      });
    };
  }, [stream, isLocal, id]);
  
  // Display Name Logic
  const user = authStore.user;
  let displayName = name || 'User';
  if (isLocal) {
      displayName = (user?.name || user?.username || 'You') + ' (Me)'; 
  } else if (!name) {
      displayName = `User ${id ? id.slice(0,4) : 'Guest'}`;
  }

  const renderVideo = () => {
    // LOCAL: Use RTCView with the local stream (consistent with remote, avoids conflict)
    if (isLocal) {
      if (!stream || typeof stream.toURL !== 'function') return null;
      const url = stream.toURL();
      if (!url) return null;
      const facing = (sfuCameraType === 'back' || sfuCameraType === 'environment') ? 'back' : 'front';
      const isFront = facing === 'front';

      return (
        <SafeRTCView
          key={`local-preview-${streamReady}`}
          streamURL={url}
          style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }]}
          objectFit="cover"
          mirror={isFront}
          zOrder={0}
        />
      );
    }

    // REMOTE: Use RTCView with zOrder=0 (SurfaceView must be in overlay to be visible)
    if (!stream || typeof stream.toURL !== 'function') return null;
    const videoTracks = stream.getVideoTracks?.() || [];
    const firstVideo = videoTracks[0] || null;
    const hasActiveVideo = videoTracks.some((t) => t.readyState !== 'ended');
    if (!hasActiveVideo) return null;

    const url = stream.toURL();
    if (!url || typeof url !== 'string') return null;

    const trackId = firstVideo?.id || '';
    const rtcKey = `remote-${id}-${trackId}-${streamReady}`;

    return (
      <SafeRTCView
        key={rtcKey}
        streamURL={url}
        style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }]}
        objectFit="cover"
        mirror={false}
        zOrder={0}
      />
    );
  };

  // Entrance animation
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const renderVideoOrPlaceholder = () => {
    const videoEl = renderVideo();
    if (videoEl) return videoEl;
    
    // Premium placeholder
    const dicebearUrl = avatar || `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(displayName)}`;

    return (
      <View style={styles.tilePlaceholder}>
        <Image 
          source={{ uri: dicebearUrl }}
          style={styles.tileAvatarImage}
          blurRadius={isPip ? 2 : 5}
        />
        <View style={styles.placeholderOverlay}>
           <ActivityIndicator size="small" color="rgba(255,255,255,0.3)" />
           {!isPip && <Text style={styles.connectingText}>CONNECTING...</Text>}
        </View>
      </View>
    );
  };

    return (
        <Animated.View style={{ 
            width: tileWidth, 
            height: tileHeight, 
            padding: isPip || !isSingle ? 4 : 0, // No padding for single video to fill boundary
            opacity: fadeAnim
        }}>
            <View style={[
                styles.participantTile, 
                isSingle && !isPip && styles.participantTileSingle,
                isPip && styles.participantTilePip,
                isPip && { margin: 0 }, // Strip adds its own margins/padding
                { 
                    borderRadius: isPip ? 16 : 30,
                    backgroundColor: isDark ? 'rgba(15, 23, 42, 0.8)' : '#FFFFFF',
                    borderColor: isDark 
                        ? (isPip ? 'rgba(59, 130, 246, 0.5)' : 'rgba(255, 255, 255, 0.15)') 
                        : (isPip ? 'rgba(59, 130, 246, 0.5)' : 'rgba(0, 0, 0, 0.08)')
                }
            ]}>
                {hasVideo ? (
                <>
                    {renderVideoOrPlaceholder()}
                    
                    {/* Flip Camera Button (Only Local) */}
                    {isLocal && (
                        <TouchableOpacity 
                            style={styles.flipCameraBtnPremium} 
                            onPress={onSwitchCamera}
                        >
                            <Ionicons name="camera-reverse-sharp" size={18} color="#fff" />
                        </TouchableOpacity>
                    )}
                </>
            ) : (
                    <View style={styles.avatarContainerLarge}>
                        <View style={[styles.avatarHalo, isPip && { width: 56, height: 56 }]}>
                            <Image 
                                source={{ uri: avatar || `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(displayName)}` }}
                                style={[styles.premiumAvatar, isPip && { width: 44, height: 44, borderRadius: 22 }]}
                            />
                        </View>
                        <Text 
                            style={[
                                styles.premiumNameText, 
                                { color: isDark ? '#fff' : COLORS.gray[800] },
                                isPip && { fontSize: 11, marginTop: 8, textAlign: 'center' }
                            ]}
                            numberOfLines={1}
                        >
                            {displayName}
                        </Text>

                        {!isPip && (
                            <View style={[styles.videoOffBadge, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.08)' }]}>
                                <Ionicons name="videocam-off" size={12} color={COLORS.error.main} />
                                <Text style={styles.videoOffText}>PAUSED</Text>
                            </View>
                        )}
                    </View>
            )}
            
            {/* Name Tag (Overlay) */}
            {!isPip && (
                <View style={styles.premiumNameTag}>
                    <Animated.View style={[
                        styles.nameTagBlur, 
                        { 
                            backgroundColor: isDark ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.95)',
                            borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
                            transform: [{ scale: hasAudio ? 1.02 : 1 }]
                        }
                    ]}>
                        <View style={[
                            styles.micIndicator, 
                            hasAudio ? styles.micActive : styles.micMuted,
                            { borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)' }
                        ]} />
                        <Text 
                            style={[styles.premiumNameTagText, { color: isDark ? '#fff' : COLORS.gray[800], marginLeft: 6 }]}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                        >
                            {displayName}
                        </Text>
                    </Animated.View>
                </View>
            )}
        </View>
    </Animated.View>
  );
};

export default memo(ParticipantTile);
