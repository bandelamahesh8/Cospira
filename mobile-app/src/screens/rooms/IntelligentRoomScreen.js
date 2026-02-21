import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../core/theme';
import VideoGrid from '../../components/room/VideoGrid';
import RoomControls from '../../components/room/RoomControls';
import AIOverlay from '../../components/room/AIOverlay';
import SystemHeader from '../../components/system-panels/SystemHeader';
import { useWebSocket } from '../../hooks/useWebSocket';
const IntelligentRoomScreen = ({ navigation, route }) => {
  const { roomId } = route.params || { roomId: 'default-room' };
  
  // Real-time Data
  const { 
    messages, 
    users, 
    roomName, 
    isConnected, 
    sendMessage,
    localStream,
    remoteStreams,
    toggleAudio,
    toggleVideo,
    isAudioEnabled,
    isVideoEnabled
  } = useWebSocket(roomId, navigation);

  // Derived State for UI - Map users to streams for grid
  // (VideoGrid now handles the stream rendering logic internally based on streams passed)

  // Mock AI Data (To be connected to AI Service later)
  const [sentiment, setSentiment] = useState('Neutral');
  const [analysis, setAnalysis] = useState('Conversation flow is optimal.');

  const handleLeave = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* 1. Immersive Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{roomName || 'SECURE ROOM'}</Text>
        <AIOverlay sentiment={sentiment} analysis={analysis} />
      </View>

      {/* 2. Main Video Area */}
      <View style={styles.gridContainer}>
        <VideoGrid 
            localStream={localStream} 
            remoteStreams={remoteStreams} 
        />
      </View>

      {/* 4. Controls */}
      <RoomControls 
        isMuted={!isAudioEnabled}
        isCameraOff={!isVideoEnabled}
        onMute={toggleAudio}
        onCamera={toggleVideo}
        onLeave={handleLeave}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    paddingTop: 20,
    backgroundColor: 'transparent',
  },
  title: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '900',
    paddingHorizontal: 20,
    marginBottom: 5,
  },
  gridContainer: {
    flex: 1,
  }
});

export default IntelligentRoomScreen;
