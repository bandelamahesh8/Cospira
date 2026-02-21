import React from 'react';
import { View, StyleSheet, Text, Dimensions } from 'react-native';
import { RTCView } from 'react-native-webrtc';

const { width } = Dimensions.get('window');

const VideoGrid = ({ localStream, remoteStreams }) => {
  // Convert Map to Array for rendering
  // remoteStreams is Map<userId, MediaStream>
  const remoteStreamsArray = Array.from(remoteStreams.entries()).map(([userId, stream]) => ({
      userId,
      stream
  }));

  const allStreams = [];
  if (localStream) {
      allStreams.push({ userId: 'me', stream: localStream, isLocal: true });
  }
  allStreams.push(...remoteStreamsArray);

  return (
    <View style={styles.container}>
      {allStreams.length === 0 ? (
        <View style={styles.placeholder}>
           <Text style={styles.text}>Waiting for participants...</Text>
        </View>
      ) : (
        <View style={styles.grid}>
           {allStreams.map((item, index) => {
                   // Safe stream URL generation
               let streamURL = null;
               let hasTracks = false;
               try {
                   if (item.stream) {
                       const tracks = item.stream.getTracks();
                       hasTracks = tracks.length > 0;
                       if (hasTracks && item.stream.toURL) {
                           streamURL = item.stream.toURL();
                           // console.log(`[VideoGrid] Stream ${item.userId}: URL=${streamURL}, Tracks=${tracks.length}`);
                       }
                   }
               } catch (e) {
                   console.error('[VideoGrid] Error getting stream URL:', e);
               }

               return (
               <View key={item.userId} style={styles.videoContainer}>
                   {streamURL && hasTracks ? (
                       <RTCView
                           streamURL={streamURL}
                           style={styles.video}
                           objectFit="cover"
                           mirror={item.isLocal} 
                           zOrder={item.isLocal ? 1 : 0} 
                       />
                   ) : (
                       <View style={styles.noVideo}>
                           <Text style={styles.userName}>{item.userId}</Text>
                           <Text style={styles.text}>(No Video)</Text>
                       </View>
                   )}
                   <View style={styles.label}>
                       <Text style={styles.labelText}>
                           {item.isLocal ? 'You' : item.userId}
                       </Text>
                   </View>
               </View>
               );
           })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  grid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoContainer: {
    width: width / 2 - 10,
    height: 200,
    margin: 5,
    backgroundColor: '#222',
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative'
  },
  video: {
    width: '100%',
    height: '100%',
  },
  noVideo: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center'
  },
  userName: {
      color: '#fff'
  },
  placeholder: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center'
  },
  text: {
      color: '#888'
  },
  label: {
      position: 'absolute',
      bottom: 5,
      left: 5,
      backgroundColor: 'rgba(0,0,0,0.5)',
      padding: 4,
      borderRadius: 4
  },
  labelText: {
      color: '#fff',
      fontSize: 12
  }
});

export default VideoGrid;
