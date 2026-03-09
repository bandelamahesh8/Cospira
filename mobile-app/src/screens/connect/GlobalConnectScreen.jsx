import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  TextInput, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView, 
  Alert, 
  Animated, 
  ActivityIndicator,
  StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { socketService } from '../../services/socket.service';
import { roomsService } from '../../services/rooms.service';
import { authStore } from '../../store/authStore';
import { normalize, wp, hp } from '../../utils/responsive';
import { useTheme } from '../../hooks/useTheme';



const GlobalConnectScreen = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  
  // -- States --
  const [status, setStatus] = useState('idle'); // idle, searching, matchFound, connecting, connected, failed
  const [matchData, setMatchData] = useState(null);
  const [interfacePriority, setInterfacePriority] = useState('video');
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [customInterest, setCustomInterest] = useState('');
  const [onlineCount, setOnlineCount] = useState('2,481');

  // -- Animations --
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const radarAnim = useRef(new Animated.Value(0)).current;
  const setupFade = useRef(new Animated.Value(1)).current;
  const searchFade = useRef(new Animated.Value(0)).current;
  const matchFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setupSocketListeners();
    startPulse();
    return () => {
      socketService.off('queue-joined');
      socketService.off('match-found');
      socketService.off('matchmaking-error');
      socketService.emit('leave-matchmaking');
    };
  }, []);

  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  };

  const startRadar = () => {
    radarAnim.setValue(0);
    Animated.loop(
      Animated.timing(radarAnim, { toValue: 1, duration: 2000, useNativeDriver: true })
    ).start();
  };

  const setupSocketListeners = () => {
    socketService.on('queue-joined', () => {
      // Transition handled in handleClick
    });

    socketService.on('match-found', (data) => {
      console.log('[GlobalConnect] Match found:', data);
      setMatchData(data);
      
      Animated.timing(searchFade, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
        setStatus('matchFound');
        Animated.timing(matchFade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
        
        // Auto-connect after 3 seconds
        setTimeout(() => handleProceedWithMatch(data), 3000);
      });
    });

    socketService.on('matchmaking-error', (err) => {
      setStatus('failed');
      Alert.alert('Uplink Failed', err.message || 'Failed to find a match');
      setTimeout(() => setStatus('idle'), 3000);
    });
  };

  const handleInitiateSearch = () => {
    Animated.timing(setupFade, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
      setStatus('searching');
      startRadar();
      Animated.timing(searchFade, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    });

    socketService.connect(authStore.msgToken || authStore.token);
    socketService.emit('join-matchmaking', {
      gameType: 'global-connect',
      mode: interfacePriority,
      interests: selectedInterests
    });
  };

  const handleCancelSearch = () => {
    Animated.timing(searchFade, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
      setStatus('idle');
      radarAnim.stopAnimation();
      Animated.timing(setupFade, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    });
    socketService.emit('leave-matchmaking');
  };

  const handleProceedWithMatch = async (data) => {
    try {
      setStatus('connecting');
      const roomName = `Sector: ${data.matchId.substring(0, 6)}`;
      const result = await roomsService.create(
        roomName,
        'public',
        null,
        { mode: interfacePriority, maxParticipants: 2, matchId: data.matchId },
        authStore.user
      );
      
      navigation.navigate('IntelligentRoom', {
        roomId: result.roomId,
        roomName,
        isHost: true,
        matchData: data
      });
    } catch (error) {
      console.error('[GlobalConnect] Room creation failed:', error);
      setStatus('failed');
    }
  };

  const toggleInterest = (interest) => {
    setSelectedInterests(prev => 
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    );
  };

  const handleAddCustomInterest = () => {
    if (!customInterest.trim()) return;
    const interest = customInterest.trim();
    if (!selectedInterests.includes(interest)) {
      setSelectedInterests(prev => [...prev, interest]);
    }
    setCustomInterest('');
  };

  // -- Render Helpers --

  const renderSetupUI = () => (
    <Animated.View style={[styles.content, { opacity: setupFade }]}>
      <View style={styles.topHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text }]}>Global Connect</Text>
          <View style={styles.onlineStatus}>
            <View style={styles.activeDot} />
            <Text style={[styles.onlineCount, { color: colors.textSecondary }]}>{onlineCount} Agents Online</Text>
          </View>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>COMMUNICATION PROTOCOL</Text>
        <View style={styles.modeGrid}>
          {[
            { id: 'video', icon: 'videocam', label: 'Neural Video' },
            { id: 'voice', icon: 'mic', label: 'Secure Voice' },
            { id: 'chat', icon: 'chatbubbles', label: 'Quantum Chat' },
          ].map((m) => (
            <TouchableOpacity 
              key={m.id}
              style={[
                styles.modeCard, 
                { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' },
                interfacePriority === m.id && styles.activeModeCard
              ]}
              onPress={() => setInterfacePriority(m.id)}
            >
              <Ionicons 
                name={m.icon} 
                size={26} 
                color={interfacePriority === m.id ? '#fff' : colors.textSecondary} 
              />
              <Text style={[styles.modeLabel, { color: interfacePriority === m.id ? '#fff' : colors.textSecondary }]}>
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: 32 }]}>INTERESTS(optional)</Text>
        
        <View style={[styles.customInputContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
          <TextInput
            style={[styles.customInput, { color: colors.text }]}
            placeholder="Add custom interest (e.g. Telugu, Gaming)"
            placeholderTextColor="#64748b"
            value={customInterest}
            onChangeText={setCustomInterest}
            onSubmitEditing={handleAddCustomInterest}
            returnKeyType="done"
          />
          <TouchableOpacity onPress={handleAddCustomInterest} style={styles.addBtn}>
            <Ionicons name="add-circle" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.interestGrid}>
          {selectedInterests.map((interest) => (
            <TouchableOpacity 
              key={interest}
              style={[
                styles.interestChip,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' },
                styles.activeInterestChip 
              ]}
              onPress={() => toggleInterest(interest)}
            >
              <Text style={[
                styles.interestText,
                { color: '#fff' }
              ]}>{interest}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Animated.View style={[styles.pulseCircle, { transform: [{ scale: pulseAnim }], opacity: 0.2 }]} />
        <TouchableOpacity style={styles.initiateBtn} onPress={handleInitiateSearch}>
          <LinearGradient
            colors={['#8B5CF6', '#2F6BFF']}
            style={styles.btnGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="flash" size={24} color="#fff" />
            <Text style={styles.btnText}>Initiate Uplink</Text>
          </LinearGradient>
        </TouchableOpacity>
        <Text style={[styles.footerSub, { color: colors.textSecondary }]}>Est. match time: 4.2s</Text>
      </View>
    </Animated.View>
  );

  const renderSearchingUI = () => {
    const radarScale = radarAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.8] });
    const radarOpacity = radarAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] });

    return (
      <Animated.View style={[styles.searchingView, { opacity: searchFade }]}>
        <View style={styles.radarBox}>
          <Animated.View style={[styles.radarRing, { transform: [{ scale: radarScale }], opacity: radarOpacity }]} />
          <Animated.View style={[styles.radarRing, { transform: [{ scale: radarScale }], opacity: radarOpacity, delay: 1000 }]} />
          <View style={styles.radarCore}>
            <Ionicons name="scan-outline" size={48} color="#fff" />
          </View>
        </View>

        <Text style={[styles.statusTitle, { color: colors.text }]}>Searching Mesh...</Text>
        <Text style={[styles.statusSub, { color: colors.textSecondary }]}>Synthesizing matches across the global network</Text>
        
        <View style={styles.searchStats}>
          <View style={[styles.statBadge, { backgroundColor: colors.primary + '10' }]}>
            <Text style={[styles.statText, { color: colors.primary }]}>{interfacePriority.toUpperCase()}</Text>
          </View>
          <View style={[styles.statBadge, { backgroundColor: '#8B5CF620' }]}>
            <Text style={[styles.statText, { color: '#8B5CF6' }]}>{selectedInterests.length || 'GLOBAL'} FILTERS</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.abortBtn} onPress={handleCancelSearch}>
          <Text style={styles.abortText}>Abort Connection</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderMatchFoundUI = () => (
    <Animated.View style={[styles.matchView, { opacity: matchFade }]}>
      <View style={styles.matchCard}>
        <LinearGradient
          colors={['#10B981', '#3B82F6']}
          style={styles.matchIconBox}
        >
          <Ionicons name="people" size={40} color="#fff" />
        </LinearGradient>
        <Text style={[styles.matchTitle, { color: colors.text }]}>Match Found!</Text>
        <Text style={[styles.matchSub, { color: colors.textSecondary }]}>98% Compatibility Synchronized</Text>
        
        <View style={styles.matchDetails}>
          <Text style={[styles.connectionPoint, { color: colors.textSecondary }]}>Connection Point: SINGAPORE-X22</Text>
        </View>

        <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
        <Text style={[styles.transitionText, { color: colors.textSecondary }]}>Finalizing neural handshake...</Text>
      </View>
    </Animated.View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      {status === 'idle' && renderSetupUI()}
      {status === 'searching' && renderSearchingUI()}
      {status === 'matchFound' && renderMatchFoundUI()}
      {(status === 'connecting' || status === 'connected') && (
        <View style={styles.loadingFull}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>Generating Intelligent Room...</Text>
        </View>
      )}
      {status === 'failed' && (
        <View style={styles.loadingFull}>
          <Ionicons name="alert-circle" size={64} color="#ef4444" />
          <Text style={[styles.loadingText, { color: colors.text }]}>Uplink Interrupted</Text>
          <TouchableOpacity onPress={() => setStatus('idle')} style={styles.retryBtn}>
            <Text style={{ color: colors.primary, fontWeight: '700' }}>Back to Terminal</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 24, paddingVertical: 16 },
  topHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  backBtn: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.05)' },
  headerText: { alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '800' },
  onlineStatus: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
  onlineCount: { fontSize: 12, fontWeight: '600' },
  scroll: { flex: 1 },
  sectionTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 1.5 },
  modeGrid: { flexDirection: 'row', gap: 12, marginTop: 16 },
  modeCard: { flex: 1, height: 110, borderRadius: 24, justifyContent: 'center', alignItems: 'center', gap: 12 },
  activeModeCard: { backgroundColor: '#2F6BFF' },
  modeLabel: { fontSize: 13, fontWeight: '700' },
  customInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
    marginBottom: 16,
  },
  customInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  addBtn: {
    paddingLeft: 12,
  },
  interestGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  interestChip: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20 },
  activeInterestChip: { backgroundColor: '#8B5CF6' },
  interestText: { fontSize: 13, fontWeight: '700' },
  footer: { alignItems: 'center', paddingVertical: 32, position: 'relative' },
  pulseCircle: { position: 'absolute', width: 220, height: 220, borderRadius: 110, borderWidth: 2, borderColor: '#2F6BFF', top: 5 },
  initiateBtn: { width: '100%', height: 64, borderRadius: 32, overflow: 'hidden' },
  btnGradient: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 },
  btnText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  footerSub: { fontSize: 12, marginTop: 16, fontWeight: '600' },
  searchingView: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  radarBox: { width: 180, height: 180, justifyContent: 'center', alignItems: 'center', marginBottom: 48 },
  radarRing: { position: 'absolute', width: '100%', height: '100%', borderRadius: 90, borderWidth: 2, borderColor: '#2F6BFF' },
  radarCore: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#2F6BFF', justifyContent: 'center', alignItems: 'center', elevation: 20, shadowColor: '#2F6BFF', shadowRadius: 20, shadowOpacity: 0.5 },
  statusTitle: { fontSize: 28, fontWeight: '800', textAlign: 'center' },
  statusSub: { fontSize: 16, textAlign: 'center', marginTop: 12, opacity: 0.8 },
  searchStats: { flexDirection: 'row', gap: 12, marginTop: 32 },
  statBadge: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  statText: { fontSize: 12, fontWeight: '800' },
  abortBtn: { marginTop: 64, padding: 16 },
  abortText: { color: '#ef4444', fontWeight: '800', fontSize: 14, letterSpacing: 1 },
  matchView: { flex: 1, justifyContent: 'center', padding: 32 },
  matchCard: { padding: 40, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  matchIconBox: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  matchTitle: { fontSize: 26, fontWeight: '800' },
  matchSub: { fontSize: 15, marginTop: 8 },
  matchDetails: { marginTop: 24, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.05)' },
  connectionPoint: { fontSize: 11, fontWeight: '700' },
  transitionText: { fontSize: 13, marginTop: 16, fontWeight: '600' },
  loadingFull: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 20 },
  loadingText: { fontSize: 18, fontWeight: '700' },
  retryBtn: { marginTop: 20 },
});

export default GlobalConnectScreen;
