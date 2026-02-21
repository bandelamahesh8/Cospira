import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, TextInput, KeyboardAvoidingView, Platform, ScrollView, Alert, Animated, PanResponder, Dimensions, BackHandler, ActivityIndicator, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { socketService } from '../../services/socket.service';
import { authStore } from '../../store/authStore';

const YOUR_IMG = 'https://i.pravatar.cc/300?img=33'; // You (Placeholder for self)

const GlobalVoiceScreen = ({ navigation }) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [duration, setDuration] = useState('00:00');
  const [isChatVisible, setIsChatVisible] = useState(true);
  const [focusedVideo, setFocusedVideo] = useState('stranger'); 
  const [status, setStatus] = useState('idle'); // idle, searching, connected
  const [matchData, setMatchData] = useState(null);
  const inputRef = React.useRef(null);
  const timerRef = useRef(null);

  // Draggable logic
  const pan = useRef(new Animated.ValueXY()).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.setOffset({ x: pan.x._value, y: pan.y._value });
        pan.setValue({ x: 0, y: 0 }); 
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: (e, gestureState) => {
        pan.flattenOffset(); 
        
        // Snap to nearest corner
        const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
        const VIDEO_WIDTH = 100;
        const VIDEO_HEIGHT = 150;
        
        const originX = screenWidth - VIDEO_WIDTH - 16;
        const originY = 110;
        
        const currentTranslateX = pan.x._value; 
        const currentTranslateY = pan.y._value;

        const currentAbsX = originX + currentTranslateX;
        const currentAbsY = originY + currentTranslateY;
        
        const targetX_TL = 16;
        const targetX_TR = screenWidth - VIDEO_WIDTH - 16;
        const targetX_BL = 16;
        const targetX_BR = screenWidth - VIDEO_WIDTH - 16;

        const targetY_Top = 110; 
        const targetY_Bottom = screenHeight - VIDEO_HEIGHT - 100; 

        const isLeft = (currentAbsX + VIDEO_WIDTH / 2) < (screenWidth / 2);
        const isTop = (currentAbsY + VIDEO_HEIGHT / 2) < (screenHeight / 2);

        let finalAbsX, finalAbsY;

        if (isTop) {
            finalAbsY = targetY_Top;
            finalAbsX = isLeft ? targetX_TL : targetX_TR;
        } else {
            finalAbsY = targetY_Bottom;
            finalAbsX = isLeft ? targetX_BL : targetX_BR;
        }
        
        const toValueX = finalAbsX - originX;
        const toValueY = finalAbsY - originY;
        
        Animated.spring(pan, { toValue: { x: toValueX, y: toValueY }, useNativeDriver: false, friction: 5, tension: 40 }).start();
      }
    })
  ).current;

  // Reset position when toggling focus
  useEffect(() => { pan.setValue({ x: 0, y: 0 }); }, [focusedVideo]);

  // Timer logic
  useEffect(() => {
    if (status === 'connected') {
        const startTime = Date.now();
        timerRef.current = setInterval(() => {
            const diff = Math.floor((Date.now() - startTime) / 1000);
            const mins = Math.floor(diff / 60).toString().padStart(2, '0');
            const secs = (diff % 60).toString().padStart(2, '0');
            setDuration(`${mins}:${secs}`);
        }, 1000);
    } else {
        clearInterval(timerRef.current);
        setDuration('00:00');
    }
    return () => clearInterval(timerRef.current);
  }, [status]);

  // Initial connection
  useEffect(() => {
    startMatchmaking();
    setupSocketListeners();

    return () => {
        socketService.off('match-found');
        socketService.off('queue-joined');
        socketService.off('matchmaking-error');
        socketService.emit('leave-matchmaking');
    };
  }, []);

  const setupSocketListeners = () => {
      socketService.on('queue-joined', (data) => {
          console.log('[Voice] Joined Queue:', data);
          setStatus('searching');
          setMessages([{ id: 'sys-1', type: 'system', text: 'Connecting to voice channel...' }]);
      });

      socketService.on('match-found', (data) => {
          console.log('[Voice] Match Found:', data);
          setStatus('connected');
          setMatchData(data);
          setMessages(prev => [...prev, { id: 'sys-2', type: 'system', text: `Voice connected with ${data.opponent?.playerName || 'Stranger'}. 🎙️` }]);
      });

      socketService.on('matchmaking-error', (err) => {
          Alert.alert('Error', err.message || 'Failed to join voice queue');
          setStatus('idle');
      });
  };

  const startMatchmaking = () => {
      setStatus('searching');
      setMessages([]);
      socketService.connect(authStore.msgToken || authStore.token);
      socketService.emit('join-matchmaking', { 
          gameType: 'global-voice', 
          mode: 'random',
          ping: 50 
      });
  };

  const handleSkip = () => {
      setStatus('searching');
      setMatchData(null);
      setMessages([]);
      socketService.emit('leave-matchmaking');
      setTimeout(() => {
          startMatchmaking();
      }, 500);
  };

  const handleSend = () => {
    if (inputText.trim().length > 0) {
      setMessages([...messages, { id: Date.now(), type: 'sent', text: inputText, time: 'Just now' }]);
      if (matchData?.matchId) {
          socketService.emit('send-message', { roomId: matchData.matchId, text: inputText });
      }
      setInputText('');
    }
  };

  const handleChatFocus = () => {
      if (!isChatVisible) { setIsChatVisible(true); }
      setTimeout(() => inputRef.current?.focus(), 100);
  };
  
  // Handle Hardware Back Button
  useEffect(() => {
    const backAction = () => {
      Alert.alert(
          'Disengage Link?',
          'Are you sure you want to leave the audio connect?',
          [
              { text: 'Cancel', onPress: () => null, style: 'cancel' },
              { text: 'Leave', style: 'destructive', onPress: () => {
                  socketService.emit('leave-matchmaking');
                  navigation.goBack();
              }}
          ]
      );
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, []);

  const handleLeave = () => {
      Alert.alert(
          'Disengage Link?',
          'Are you sure you want to leave the audio connect?',
          [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Leave', style: 'destructive', onPress: () => {
                  socketService.emit('leave-matchmaking');
                  navigation.goBack();
              }}
          ]
      );
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient colors={['#fdf4ff', '#f3f4ff', '#e0e7ff']} style={styles.background} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={[styles.scrollContent, (!isChatVisible || focusedVideo) && { flex: 1 }]} scrollEnabled={isChatVisible && !focusedVideo}>
          
          {/* --- AVATAR GRID --- */}
          <View style={[styles.videoGrid, (!isChatVisible || focusedVideo) && styles.videoGridExpanded]}>
            {/* YOU CARD (Voice Avatar) */}
            <Animated.View 
                {...(focusedVideo === 'stranger' ? panResponder.panHandlers : {})}
                style={[
                    styles.videoCard, !focusedVideo && { flex: 1 }, focusedVideo === 'you' && { flex: 1 },
                    focusedVideo === 'stranger' && styles.floatingVideo,
                    focusedVideo === 'stranger' && { transform: [{ translateX: pan.x }, { translateY: pan.y }] }
                ]}
            >
                <TouchableOpacity 
                    activeOpacity={0.9}
                    onPress={() => focusedVideo === 'stranger' && setFocusedVideo('you')}
                    disabled={focusedVideo !== 'stranger'}
                    style={[styles.avatarCardContent, { backgroundColor: '#e2e8f0' }]}
                >
                   <Image source={{ uri: YOUR_IMG }} style={focusedVideo === 'stranger' ? styles.floatingAvatar : styles.largeAvatar} />
                   <View style={styles.micStatus}>
                       <Ionicons name="mic" size={14} color="#fff" />
                   </View>
                </TouchableOpacity>
            </Animated.View>

            {/* STRANGER CARD (Voice Avatar) */}
            <Animated.View 
                {...(focusedVideo === 'you' ? panResponder.panHandlers : {})}
                style={[
                    styles.videoCard, !focusedVideo && { flex: 1 }, focusedVideo === 'stranger' && { flex: 1 },
                    focusedVideo === 'you' && styles.floatingVideo,
                    focusedVideo === 'you' && { transform: [{ translateX: pan.x }, { translateY: pan.y }] }
                ]}
            >
                <TouchableOpacity 
                    activeOpacity={0.9}
                    onPress={() => focusedVideo === 'you' && setFocusedVideo('stranger')}
                    disabled={focusedVideo !== 'you'}
                    style={[styles.avatarCardContent, { backgroundColor: '#c7d2fe' }]}
                >
                    {status === 'searching' ? (
                        <View style={{alignItems: 'center'}}>
                            <ActivityIndicator size="large" color="#6366f1" />
                            <Text style={[styles.speakingText, {marginTop: 10}]}>Scanning...</Text>
                        </View>
                    ) : (
                        <>
                            {focusedVideo === 'stranger' && (
                                <View style={styles.rippleContainer}>
                                    <View style={[styles.ripple, { width: 140, height: 140, opacity: 0.2 }]} />
                                    <View style={[styles.ripple, { width: 180, height: 180, opacity: 0.1 }]} />
                                </View>
                            )}
                        
                           <Image source={{ uri: 'https://i.pravatar.cc/300?img=12' }} style={focusedVideo === 'you' ? styles.floatingAvatar : styles.largeAvatar} />
                           <View style={[styles.micStatus, { backgroundColor: '#6366f1' }]}>
                               <Ionicons name="mic" size={14} color="#fff" />
                           </View>
                           
                           {focusedVideo === 'stranger' && 
                                <Text style={styles.speakingText}>Connected</Text>
                           }
                        </>
                    )}
                </TouchableOpacity>
            </Animated.View>
          </View>

          {/* --- CHAT SECTION --- */}
          {isChatVisible && (
          <View style={styles.chatSection}>
              <View style={styles.chatHeader}>
                  <TouchableOpacity onPress={() => setIsChatVisible(false)}>
                      <Ionicons name="close" size={20} color="#94a3b8" />
                  </TouchableOpacity>
                  <Text style={styles.chatTitle}>
                      {status === 'searching' ? 'Establishing Audio Link...' : `Chat with ${matchData?.opponent?.playerName || 'Stranger'}`}
                  </Text>
                  <Ionicons name="ellipsis-horizontal" size={20} color="#94a3b8" />
              </View>

              <ScrollView style={styles.messagesScrollView}>
                  <View style={styles.messagesContainer}>
                      {messages.map((msg) => (
                          <View key={msg.id} style={[
                              msg.type === 'system' ? styles.systemMsgContainer : 
                              msg.type === 'sent' ? styles.sentMsgBubble : styles.receivedMsgBubble
                          ]}>
                              <Text style={msg.type === 'sent' ? styles.sentMsgText : (msg.type === 'system' ? styles.systemMsgText : styles.msgText)}>
                                  {msg.text}
                              </Text>
                          </View>
                      ))}
                  </View>
              </ScrollView>

              <View style={styles.inputRow}>
                  <TextInput 
                      ref={inputRef}
                      style={styles.chatInput}
                      placeholder="Type a message..."
                      placeholderTextColor="#94a3b8"
                      value={inputText}
                      onChangeText={setInputText}
                      onSubmitEditing={handleSend}
                      editable={status === 'connected'}
                  />
                  <TouchableOpacity style={styles.sendBtn} onPress={handleSend} disabled={status !== 'connected'}>
                      <Ionicons name="send" size={20} color={status === 'connected' ? "#6366f1" : "#cbd5e1"} />
                  </TouchableOpacity>
              </View>

              <View style={styles.controlsRow}>
                  <TouchableOpacity style={[styles.controlBtn, { flex: 1 }]} onPress={handleSkip}>
                      <View style={[styles.btnBase, { backgroundColor: '#e9d5ff' }]}>
                          <Ionicons name="play-forward" size={20} color="#6b21a8" />
                          <Text style={[styles.controlText, { color: '#6b21a8' }]}>Skip</Text>
                      </View>
                  </TouchableOpacity>
              </View>
          </View>
          )}

          {/* Controls when chat is hidden */}
          {!isChatVisible && (
               <View style={styles.floatingControls}>
                  <TouchableOpacity style={[styles.controlBtn, { flex: 1 }]} onPress={handleSkip}>
                      <View style={[styles.btnBase, { backgroundColor: '#e9d5ff' }]}>
                          <Ionicons name="play-forward" size={20} color="#6b21a8" />
                          <Text style={[styles.controlText, { color: '#6b21a8' }]}>Skip</Text>
                      </View>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.controlBtn, { flex: 1 }]} onPress={() => setIsChatVisible(true)}>
                      <View style={[styles.btnBase, { backgroundColor: '#8b5cf6' }]}>
                          <Ionicons name="chatbubble" size={20} color="#fff" />
                          <Text style={styles.controlText}>Chat</Text>
                      </View>
                  </TouchableOpacity>
               </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.header}>
        <TouchableOpacity onPress={handleLeave} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Global Connect</Text>
          <View style={styles.statusRow}>
              <Text style={styles.statusText}>{status === 'connected' ? `Connected • ${duration}` : 'Searching...'}</Text>
              <View style={styles.secureBadge}>
                  <Ionicons name="lock-closed" size={10} color="#166534" style={{marginRight: 2}} />
                  <Text style={styles.secureText}>Secure</Text>
              </View>
          </View>
        </View>
        <TouchableOpacity style={[styles.iconBtn, { backgroundColor: '#be123c' }]} onPress={handleLeave}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  background: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, marginTop: Platform.OS === 'android' ? 40 : 0, zIndex: 999, elevation: 50 },
  iconBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', borderRadius: 22, shadowColor: '#64748b', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  statusText: { fontSize: 12, color: '#64748b', fontWeight: '500', marginRight: 6 },
  secureBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#dcfce7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  secureText: { fontSize: 10, fontWeight: '700', color: '#166534' },
  scrollContent: { flex: 1, paddingBottom: 20 },
  videoGrid: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 20, height: 220, flexShrink: 0 },
  videoGridExpanded: { flex: 1, marginBottom: 80 },
  floatingControls: { position: 'absolute', bottom: 30, left: 20, right: 20, flexDirection: 'row', height: 52, backgroundColor: 'transparent' },
  videoCard: { flex: 1, backgroundColor: '#000000', borderRadius: 24, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5, marginRight: 12 },
  avatarCardContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  largeAvatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 4, borderColor: '#fff' },
  floatingAvatar: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: '#fff' },
  floatingVideo: { position: 'absolute', right: 16, top: 110, width: 100, height: 150, borderRadius: 12, zIndex: 100, elevation: 20, borderWidth: 2, borderColor: '#fff', backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  micStatus: { position: 'absolute', bottom: 20, right: '35%', backgroundColor: '#10b981', width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  rippleContainer: { position: 'absolute', justifyContent: 'center', alignItems: 'center' },
  ripple: { backgroundColor: '#6366f1', borderRadius: 999, position: 'absolute' },
  speakingText: { marginTop: 12, color: '#4f46e5', fontWeight: '700', fontSize: 14 },
  chatSection: { flex: 1, marginTop: 24, backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 20, borderRadius: 24, padding: 20, shadowColor: '#94a3b8', shadowOffset: {width: 0, height: 8}, shadowOpacity: 0.15, shadowRadius: 24, elevation: 10 },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  chatTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  messagesScrollView: { flex: 1 },
  messagesContainer: { paddingBottom: 16 },
  systemMsgContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', alignSelf: 'flex-start', paddingRight: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 12 },
  tinyAvatar: { width: 24, height: 24, borderRadius: 12, marginRight: 8, marginLeft: 4 },
  systemMsgText: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  receivedMsgBubble: { backgroundColor: '#f3e8ff', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderTopLeftRadius: 4, alignSelf: 'flex-start', marginBottom: 10, maxWidth: '80%' },
  msgText: { fontSize: 15, color: '#334155' },
  sentMsgBubble: { backgroundColor: '#3b82f6', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderBottomRightRadius: 4, alignSelf: 'flex-end', marginBottom: 10, maxWidth: '80%' },
  sentMsgText: { fontSize: 15, color: '#fff' },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, marginBottom: 20 },
  chatInput: { flex: 1, fontSize: 15, color: '#334155', padding: 0 },
  sendBtn: { marginLeft: 12 },
  controlsRow: { flexDirection: 'row', height: 52 },
  controlBtn: { flex: 1, marginRight: 12 },
  btnBase: { flex: 1, borderRadius: 26, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  controlText: { fontSize: 15, fontWeight: '700', color: '#fff', marginLeft: 8 },
});

export default GlobalVoiceScreen;
