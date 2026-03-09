import React, { memo, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, NativeModules } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { styles as globalStyles, COLORS } from '../../styles/InnerRoomScreen.styles';

let NativeRTCView = null;
const hasNativeWebRTC = !!NativeModules.WebRTCModule;

if (hasNativeWebRTC) {
  try {
    const webrtcModule = require('react-native-webrtc');
    NativeRTCView = webrtcModule.RTCView;
  } catch (e) {
    console.warn('[ScreenShare] Failed to import RTCView:', e.message);
  }
}

const SafeRTCView = ({ streamURL, style }) => {
  if (NativeRTCView) {
    return <NativeRTCView streamURL={streamURL} style={style} objectFit="contain" zOrder={1} />;
  }
  return (
    <View style={style}>
        <Ionicons name="desktop-outline" size={64} color={COLORS.gray[500]} />
        <Text style={{ color: '#fff', marginTop: 12 }}>RTCView Unavailable</Text>
    </View>
  );
};

const ScreenShare = ({ screenShareStream, onStop }) => {
  const [streamUrl, setStreamUrl] = useState(null);

  useEffect(() => {
    if (screenShareStream && typeof screenShareStream.toURL === 'function') {
      setStreamUrl(screenShareStream.toURL());
    }
  }, [screenShareStream]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
            <Ionicons name="desktop" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.titleText}>
              {screenShareStream?.userName || 'User'}'s Screen Share
            </Text>
        </View>
        <TouchableOpacity 
            onPress={onStop} 
            style={styles.closeBtn}
            accessible={true}
            accessibilityLabel="Stop sharing"
        >
          <Ionicons name="close-circle" size={26} color={COLORS.error.main} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.content}>
        {streamUrl && !screenShareStream?.isLocal ? (
           <SafeRTCView streamURL={streamUrl} style={styles.videoStream} />
        ) : (
           <View style={styles.placeholderContainer}>
             <Ionicons name="desktop-outline" size={64} color={COLORS.gray[500]} />
             <Text style={[styles.placeholderText, { textAlign: 'center', marginHorizontal: 20 }]}>
               {screenShareStream?.isLocal 
                  ? 'You are sharing your screen.\nSwitch to another app or the home screen.' 
                  : 'Screen Share Active'}
             </Text>
           </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    borderRadius: 16,
    overflow: 'hidden',
    margin: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(25, 25, 25, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 10,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  closeBtn: {
    padding: 2,
  },
  content: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoStream: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
  }
});

export default memo(ScreenShare);
