import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, TextInput, KeyboardAvoidingView, Platform, ScrollView, Alert, Animated, ActivityIndicator } from 'react-native';
import PressableScale from '../../components/animations/PressableScale';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import LinearGradient from 'react-native-linear-gradient';
import { socketService } from '../../services/socket.service';
import { roomsService } from '../../services/rooms.service';
import { authStore } from '../../store/authStore';
import { theme } from '../../core/theme';
import { normalize, wp, hp } from '../../utils/responsive';
import { useTheme } from '../../hooks/useTheme';

const SUGGESTED_INTERESTS = ['Cyberpunk', 'AI', 'Coding', 'Music', 'Startup', 'Anime', 'Crypto', 'Space'];

const GlobalConnectScreen = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const [status, setStatus] = useState('idle'); // idle, searching, connected
  const [matchData, setMatchData] = useState(null);
  const [interfacePriority, setInterfacePriority] = useState('video'); // video, voice, chat
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [customInterest, setCustomInterest] = useState('');
  const [onlineCount, setOnlineCount] = useState('2000+');

  // active match state (from previous version)
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [duration, setDuration] = useState('00:00');
  const timerRef = useRef(null);

  useEffect(() => {
    // Basic setup
    setupSocketListeners();
    return () => {
      socketService.off('queue-joined');
      socketService.off('match-found');
      socketService.off('matchmaking-error');
      socketService.emit('leave-matchmaking');
    };
  }, []);

  const setupSocketListeners = () => {
    socketService.on('queue-joined', () => setStatus('searching'));
    socketService.on('match-found', async (data) => {
      console.log('[GlobalConnect] Match found:', data);
      setStatus('connected');
      setMatchData(data);
      
      // Auto-create room and navigate after showing match found UI
      setTimeout(async () => {
        try {
          setStatus('connecting');
          const roomName = `Global Connect - ${Date.now()}`;
          
          const result = await roomsService.create(
            roomName,
            'public',
            null,
            { mode: interfacePriority, maxParticipants: 2, matchId: data.matchId }
          );
          
          navigation.navigate('IntelligentRoom', {
            roomId: result.roomId,
            roomName,
            isHost: true,
            matchData: data
          });
        } catch (error) {
          console.error('[GlobalConnect] Room creation failed:', error);
          Alert.alert('Connection Failed', 'Failed to establish connection.');
          setStatus('idle');
        }
      }, 2000);
    });
    socketService.on('matchmaking-error', (err) => {
      console.log('[GlobalConnect] Matchmaking error:', err);
      setStatus('failed');
      Alert.alert('Matchmaking Error', err.message || 'Failed to find a match');
      setTimeout(() => setStatus('idle'), 3000);
    });
  };

  const handleInitiateSearch = () => {
    setStatus('searching');
    socketService.connect(authStore.msgToken || authStore.token);
    socketService.emit('join-matchmaking', {
      gameType: 'global-connect',
      mode: interfacePriority,
      interests: [...selectedInterests, ...(customInterest ? [customInterest] : [])]
    });
  };

  const toggleInterest = (interest) => {
    if (selectedInterests.includes(interest)) {
      setSelectedInterests(selectedInterests.filter(i => i !== interest));
    } else {
      setSelectedInterests([...selectedInterests, interest]);
    }
  };

  const renderSetupUI = () => (
    <View style={styles.idleContainer}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Global Connect</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Instantly match with users worldwide</Text>
      </View>

      <TouchableOpacity 
        style={styles.actionZone} 
        activeOpacity={0.9} 
        onPress={handleInitiateSearch}
      >
        <View style={[styles.pulseRing, { borderColor: colors.primary + '40' }]} />
        <LinearGradient
            colors={['#8B5CF6', '#3B82F6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.mainCircle}
        >
            <Ionicons name="flash" size={normalize(48)} color="#fff" />
        </LinearGradient>
        
        <View style={styles.actionTextContainer}>
            <Text style={[styles.actionPrimaryText, { color: colors.text }]}>Tap to Connect</Text>
            <Text style={[styles.actionSecondaryText, { color: colors.textSecondary }]}>AI-powered matching</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.prefToggle}
        onPress={() => {/* preferences logic */}}
      >
        <Text style={[styles.prefToggleText, { color: colors.textSecondary }]}>Preferences</Text>
        <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
      </TouchableOpacity>

      <View style={styles.footerStatus}>
        <View style={[styles.statusBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }]}>
            <Text style={[styles.statusInfoText, { color: colors.textSecondary }]}>{onlineCount} users online</Text>
            <View style={styles.statusDivider} />
            <Text style={[styles.statusInfoText, { color: colors.textSecondary }]}>Avg time: ~4s</Text>
        </View>
      </View>
    </View>
  );

  const renderFailureUI = () => {
    return (
      <View style={styles.searchingContainer}>
          <View style={[styles.searchingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.matchFoundIconBox, { backgroundColor: '#fee2e2' }]}>
                  <Ionicons name="alert-circle" size={normalize(32)} color="#ef4444" />
              </View>
              <Text style={[styles.searchingTitle, { color: colors.text }]}>No match found</Text>
              <Text style={[styles.searchingSub, { color: colors.textSecondary }]}>Try again</Text>
              
              <TouchableOpacity 
                  style={[styles.connectBtn, { backgroundColor: colors.surface2 }]} 
                  onPress={() => setStatus('idle')}
              >
                  <Text style={[styles.connectBtnText, { color: colors.text }]}>Retry</Text>
              </TouchableOpacity>
          </View>
      </View>
    );
  };
  const renderSearchingUI = () => {
    return (
      <View style={styles.searchingContainer}>
          <View style={[styles.searchingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.searchingAnimationBox}>
                  <ActivityIndicator size="small" color={colors.primary} />
              </View>
              <Text style={[styles.searchingTitle, { color: colors.text }]}>Searching...</Text>
              <Text style={[styles.searchingSub, { color: colors.textSecondary }]}>Finding the best match</Text>
              
              {/* No cancel button - Premium lock-in */}
          </View>
      </View>
    );
  };

  const renderMatchFoundUI = () => {
    return (
      <View style={styles.searchingContainer}>
          <View style={[styles.searchingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.matchFoundIconBox, { backgroundColor: colors.primary + '20' }]}>
                  <Ionicons name="people" size={normalize(32)} color={colors.primary} />
              </View>
              <Text style={[styles.searchingTitle, { color: colors.text }]}>Match Found</Text>
              <Text style={[styles.searchingSub, { color: colors.textSecondary }]}>High compatibility</Text>
              
              <TouchableOpacity 
                  style={styles.connectBtn} 
                  onPress={() => setStatus('connecting')}
              >
                  <LinearGradient
                      colors={['#8B5CF6', '#3B82F6']}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                      style={styles.connectGradient}
                  >
                      <Text style={styles.connectBtnText}>Connect</Text>
                  </LinearGradient>
              </TouchableOpacity>
          </View>
      </View>
    );
  };

  const renderConnectingUI = () => {
    return (
      <View style={styles.searchingContainer}>
          <View style={[styles.searchingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.searchingTitle, { color: colors.text, marginTop: 32 }]}>Establishing connection</Text>
              <Text style={[styles.searchingSub, { color: colors.textSecondary }]}>Optimizing secure uplink</Text>
          </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <LinearGradient 
        colors={isDark ? [colors.background, colors.background] : ['#ffffff', '#f8fafc']} 
        style={styles.background} 
      />
      
      {status === 'idle' && renderSetupUI()}
      {status === 'searching' && renderSearchingUI()}
      {status === 'matchFound' && renderMatchFoundUI()}
      {status === 'connecting' && renderConnectingUI()}
      {status === 'failed' && renderFailureUI()}
      {status === 'connected' && (
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
            <Text style={{ color: colors.text }}>Joined Session</Text>
            <TouchableOpacity onPress={() => setStatus('idle')} style={{marginTop: 20}}>
                <Text style={{color: colors.primary}}>Restart</Text>
            </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  background: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  idleContainer: {
    flex: 1,
    paddingHorizontal: wp(6),
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: hp(4),
  },
  header: {
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontSize: normalize(26),
    fontWeight: '600',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: normalize(15),
    marginTop: 8,
    textAlign: 'center',
  },
  actionZone: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainCircle: {
    width: normalize(120),
    height: normalize(120),
    borderRadius: normalize(60),
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  pulseRing: {
    position: 'absolute',
    width: normalize(160),
    height: normalize(160),
    borderRadius: normalize(80),
    borderWidth: 2,
    opacity: 0.3,
  },
  actionTextContainer: {
    marginTop: 32,
    alignItems: 'center',
  },
  actionPrimaryText: {
    fontSize: normalize(20),
    fontWeight: '600',
    marginBottom: 4,
  },
  actionSecondaryText: {
    fontSize: normalize(13),
    fontWeight: '500',
  },
  prefToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  prefToggleText: {
    fontSize: normalize(14),
    fontWeight: '500',
  },
  footerStatus: {
    width: '100%',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.02)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 99,
  },
  statusInfoText: {
    fontSize: normalize(11),
    fontWeight: '600',
  },
  statusDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginHorizontal: 10,
  },
  searchingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  searchingCard: {
    padding: 40,
    borderRadius: 14,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
  },
  searchingTitle: {
    fontSize: normalize(18),
    fontWeight: '600',
    marginTop: 24,
  },
  searchingSub: {
    fontSize: normalize(14),
    marginTop: 8,
  },
  cancelBtn: {
    marginTop: 32,
    paddingVertical: 10,
  },
  cancelText: {
    color: '#ef4444',
    fontWeight: '700',
    fontSize: normalize(15),
  },
  searchingAnimationBox: {
    padding: 20,
  },
  matchFoundIconBox: {
    width: normalize(72),
    height: normalize(72),
    borderRadius: normalize(36),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  connectBtn: {
    marginTop: 32,
    width: '100%',
    height: 56,
    borderRadius: 14,
    overflow: 'hidden',
  },
  connectGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectBtnText: {
    color: '#ffffff',
    fontSize: normalize(16),
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default GlobalConnectScreen;
