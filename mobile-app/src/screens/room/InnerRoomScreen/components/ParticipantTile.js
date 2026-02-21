import React, { memo, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Image, NativeModules } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Camera, useCameraDevice } from 'react-native-vision-camera';
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
const SafeCameraView = ({ style, facing, mirror }) => {
  const preferredDevice = useCameraDevice(facing || 'front');
  const fallbackDevice = useCameraDevice(facing === 'front' ? 'back' : 'front');
  
  const device = preferredDevice || fallbackDevice;
  
  useEffect(() => {
    if (!device) {
      console.warn('[SafeCameraView] No camera device found! Check permissions or device capabilities.');
    } else {
      console.log('[SafeCameraView] Camera active:', {
        requested: facing,
        using: device.position,
        name: device.name,
        id: device.id
      });
    }
  }, [device, facing]);
  
  if (!device) return (
    <View style={[style, { backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center' }]}>
      <Ionicons name="videocam-off" size={24} color="#fff" />
      <Text style={{color: '#fff', fontSize: 10, marginTop: 4}}>No Camera</Text>
    </View>
  );
  
  return (
    <Camera
      style={style}
      device={device}
      isActive={true}
      video={true}
      audio={false}
      mirror={mirror !== undefined ? mirror : device.position === 'front'}
    />
  );
};

const SafeRTCView = ({ streamURL, style, objectFit, mirror, zOrder }) => {
  // Only use native RTCView - never use a mock that renders null
  if (NativeRTCView) {
    return (
      <NativeRTCView 
        streamURL={streamURL} 
        style={style} 
        objectFit={objectFit || 'cover'} 
        mirror={mirror || false} 
        zOrder={zOrder || 0} 
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

  const hasVideo = isLocal ? sfuVideoEnabled : remoteHasVideo;
  const hasAudio = isLocal ? sfuAudioEnabled : remoteHasAudio;

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
      const onEnded = () => {
        console.log(`[ParticipantTile] Track ${track.kind} ended for ${isLocal ? 'local' : id}`);
        setStreamReady(prev => prev + 1);
      };
      const onMute = () => {
        console.log(`[ParticipantTile] Track ${track.kind} muted for ${isLocal ? 'local' : id}`);
        setStreamReady(prev => prev + 1);
      };
      const onUnmute = () => {
        console.log(`[ParticipantTile] Track ${track.kind} unmuted for ${isLocal ? 'local' : id}`);
        setStreamReady(prev => prev + 1);
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
    if (!stream || typeof stream.toURL !== 'function') return null;
    const videoTracks = stream.getVideoTracks?.() || [];
    const firstVideo = videoTracks[0] || null;
    // Local tracks on some Android devices can report odd readyState values when
    // remote video starts. For LOCAL preview, trust track existence; for REMOTE,
    // only hide when tracks are actually ended.
    const hasActiveVideo = isLocal
      ? videoTracks.length > 0
      : videoTracks.some((t) => t.readyState !== 'ended');
    if (!hasActiveVideo) return null;

    const url = stream.toURL();
    if (!url || typeof url !== 'string') return null;

    // Key by tile + track id so we remount only when the track changes, not on mute/stream URL churn
    const trackId = firstVideo?.id || '';
    const rtcKey = isLocal ? `local-${trackId || 'cam'}` : `remote-${id}-${trackId}`;

    return (
      <SafeRTCView
        key={rtcKey}
        streamURL={url}
        style={{ flex: 1, width: '100%', height: '100%' }}
        objectFit="cover"
        mirror={isLocal && (sfuCameraType === 'front' || sfuCameraType === 'user')}
        zOrder={isLocal ? 1 : 0}
      />
    );
  };

  const renderVideoOrPlaceholder = () => {
    const videoEl = renderVideo();
    if (videoEl) return videoEl;

    if (isLocal) {
      if (sfuVideoEnabled) {
        return (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a2e' }}>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={{ color: '#888', fontSize: 10, marginTop: 4 }}>Starting Camera...</Text>
          </View>
        );
      }
      return null;
    }

    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a2e' }}>
        <ActivityIndicator size="small" color="#fff" />
        <Text style={{ color: '#888', fontSize: 10, marginTop: 4 }}>Connecting...</Text>
      </View>
    );
  };

  return (
    <View style={{ 
        width: tileWidth, 
        height: tileHeight, 
        padding: isPip || !isSingle ? 4 : 0
    }}>
        <View style={{ 
            flex: 1, 
            backgroundColor: isSingle && !isPip ? 'transparent' : COLORS.gray[800], 
            borderWidth: isPip || !isSingle ? 1 : 0, 
            borderColor: COLORS.gray[700], 
        }}>
            {hasVideo ? (
            <>
                {renderVideoOrPlaceholder()}
                
                {/* Flip Camera Button (Only Local) */}
                {isLocal && (
                    <TouchableOpacity 
                        style={styles.flipCameraBtn} 
                        onPress={onSwitchCamera}
                        accessible={true}
                        accessibilityLabel="Flip camera"
                        accessibilityRole="button"
                    >
                        <Ionicons name="camera-reverse" size={isPip ? 16 : 20} color="#fff" />
                    </TouchableOpacity>
                )}
            </>
        ) : (
                <View style={[styles.avatar, { flex: 1, backgroundColor: isSingle ? 'transparent' : COLORS.gray[900] }]}>
                    {/* Avatar Fallback with DiceBear */}
                    {(() => {
                        const size = isPip ? 45 : Math.min((typeof tileWidth === 'number' ? tileWidth : 100) * 0.30, (typeof tileHeight === 'number' ? tileHeight : 100) * 0.30, 120);
                        const dicebearUrl = avatar || `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(displayName)}`;
                        
                        return (
                            <View style={{ 
                                width: size, 
                                height: size, 
                                borderRadius: size / 2, 
                                backgroundColor: COLORS.gray[800], 
                                justifyContent: 'center', alignItems: 'center',
                                borderWidth: 4,
                                borderColor: 'rgba(255,255,255,0.2)',
                                overflow: 'hidden'
                            }}>
                                <Image 
                                    source={{ uri: dicebearUrl }}
                                    style={{ width: '100%', height: '100%' }}
                                    resizeMode="cover"
                                />
                            </View>
                        );
                    })()}
                    <Text style={{ color: '#fff', marginTop: 16, fontSize: isPip ? 10 : 18, fontWeight: '700', letterSpacing: 0.5 }}>
                        {displayName}
                    </Text>
                    <View style={{ 
                        marginTop: 6, 
                        paddingHorizontal: 8, 
                        paddingVertical: 2, 
                        backgroundColor: COLORS.error.surface, 
                        borderRadius: 4,
                        flexDirection: 'row',
                        alignItems: 'center'
                    }}>
                        <Ionicons name="videocam-off" size={isPip ? 10 : 14} color={COLORS.error.main} />
                    </View>
            </View>
        )}
        
        {/* Name Tag (Overlay) - Always show unless PIP/Mini */}
        {!isPip && hasVideo && (
            <View style={styles.nameTag}>
                <Text style={styles.nameTagText}>{displayName}</Text>
                {!hasAudio && (
                    <Ionicons name="mic-off" size={12} color={COLORS.error.main} style={{ marginLeft: 6 }} />
                )}
            </View>
        )}

        {/* Mic Status Indicator for PIP */}
        {isPip && isLocal && (
            <View style={[
                styles.micIndicator,
                !sfuAudioEnabled ? styles.micMuted : styles.micActive
            ]} />
        )}
    </View>

</View>
  );
};

export default memo(ParticipantTile);
