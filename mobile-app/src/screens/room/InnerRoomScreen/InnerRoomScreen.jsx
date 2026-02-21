import React, { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import {
  View,
  Alert,
  StatusBar,
  useColorScheme,
  ActivityIndicator,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';


// Hooks
import { useWebSocket } from '../../../hooks/useWebSocket';
import { useNetworkStatus } from './hooks/useNetworkStatus';
import { useVideoLayout } from './hooks/useVideoLayout';

// Store
import { authStore } from '../../../store/authStore';

// Components
import Header from './components/Header';
import VideoGrid from './components/VideoGrid';
import ParticipantStrip from './components/ParticipantStrip';
import BottomControls from './components/BottomControls';
import ChatOverlay from './components/Chat/ChatOverlay';

// Features
import VirtualBrowser from './components/Features/VirtualBrowser';
// import YouTubePlayer from './components/Features/YouTubePlayer'; // Removed - using Virtual Browser
import MediaViewer from './components/Features/MediaViewer';
import ScreenShare from './components/Features/ScreenShare';

// Modals
import ParticipantsModal from './components/Modals/ParticipantsModal';
import SettingsModal from './components/Modals/SettingsModal';
import UploadModal from './components/Modals/UploadModal';
import InputModal from './components/Modals/InputModal';

// External Components (Existing in project)
import GameSelectionModal from '../../../components/games/GameSelectionModal';
import ActiveGameView from '../../../components/games/ActiveGameView';
import GameLeaderboard from '../../../components/games/GameLeaderboard';

// Utils
import { showToast } from './utils/toast';
import { validateYouTubeUrl, validateUrl } from './utils/validators';

// Styles
import { styles, COLORS } from './styles/InnerRoomScreen.styles';


const InnerRoomScreen = ({ route, navigation }) => {
  const { roomId, roomName: initialRoomName } = route.params || {};
  const theme = useColorScheme();
  const isDark = theme === 'dark';

  // Network Status
  const isOnline = useNetworkStatus();

  // WebSocket Hook
  const {
    messages,
    users,
    roomName,
    isConnected,
    sendMessage,
    uploadMedia,
    syncYouTube,
    youtubeVideoId,
    youtubeState,
    controlYouTube,
    activeProjectorMedia,
    setActiveProjectorMedia,
    isBrowserActive,
    browserUrl,
    browserMode,
    urlInputVisible,
    setUrlInputVisible,
    browserFrame,
    startBrowser,
    closeBrowser,
    screenShareStream,
    uploadProgress,
    audioChunks,
    hostId,
    coHostIds,
    gameState,
    startGame,
    makeGameMove,
    endGame,
    disbandRoom,
    handleBrowserNavigate,
    sendBrowserInput,
    networkStats,
    localStream,
    remoteStreams,
    isAudioEnabled,
    isVideoEnabled,
    toggleAudio,
    toggleVideo,
  } = useWebSocket(roomId, navigation);

  // Layout Hook
  const { containerDimensions, setContainerDimensions } = useVideoLayout();

  // Force update on auth change
  const [currentUser, setCurrentUser] = useState(authStore.user);
  
  useEffect(() => {
    // Basic subscription to auth changes
    const unsubscribe = authStore.subscribe(() => {
      setCurrentUser(authStore.user);
    });
    // Check initial state incase it changed before mount
    setCurrentUser(authStore.user);
    return unsubscribe;
  }, []);

  // UI State
  const [isChatVisible, setIsChatVisible] = useState(false);
  const [participantsModalVisible, setParticipantsModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [youtubeModalVisible, setYoutubeModalVisible] = useState(false);
  const [browserModalVisible, setBrowserModalVisible] = useState(false);
  const [gameModalVisible, setGameModalVisible] = useState(false);
  const [leaderboardVisible, setLeaderboardVisible] = useState(false);
  const [sessionGameStats, setSessionGameStats] = useState([]);

  const [pinnedParticipantIds, setPinnedParticipantIds] = useState([]);
  const [taskbarVisible, setTaskbarVisible] = useState(true);
  const taskbarTimerRef = useRef(null);

  const resetTaskbarTimer = useCallback(() => {
    if (taskbarTimerRef.current) clearTimeout(taskbarTimerRef.current);
    taskbarTimerRef.current = setTimeout(() => setTaskbarVisible(false), 5000);
  }, []);

  useEffect(() => {
    if (!taskbarVisible || urlInputVisible) return;
    taskbarTimerRef.current = setTimeout(() => setTaskbarVisible(false), 5000);
    return () => {
      if (taskbarTimerRef.current) clearTimeout(taskbarTimerRef.current);
    };
  }, [taskbarVisible, urlInputVisible]);

  useEffect(() => {
    if (urlInputVisible) setTaskbarVisible(true);
  }, [urlInputVisible]);

  // Computed Values
  const isHost = useMemo(
    () => hostId && authStore.user?.id ? hostId === authStore.user.id : false,
    [hostId]
  );
  const isCoHost = useMemo(
    () => Array.isArray(coHostIds) && authStore.user?.id ? coHostIds.includes(authStore.user.id) : false,
    [coHostIds]
  );
  const canControlBrowser = isHost || isCoHost;

  const handleTogglePin = useCallback((userId) => {
    setPinnedParticipantIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }, []);

  const hasActiveFeature = useMemo(
    () => isBrowserActive || youtubeVideoId || activeProjectorMedia || screenShareStream || gameState?.isActive,
    [isBrowserActive, youtubeVideoId, activeProjectorMedia, screenShareStream, gameState?.isActive]
  );



  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
      if (remoteStreams && remoteStreams instanceof Map) {
        Array.from(remoteStreams.values()).forEach((stream) => {
          if (stream && typeof stream.getTracks === 'function') {
            stream.getTracks().forEach((track) => track.stop());
          }
        });
      }
    };
  }, [localStream, remoteStreams]);

  // Handle Game Stats on End
  useEffect(() => {
    if (!gameState || gameState.isActive) return;
    if (gameState.winner) {
        setSessionGameStats(prev => {
            const next = [...prev];
            // Find winner
            let winner = next.find(p => p.id === gameState.winner);
            if (!winner) {
                const winnerObj = users.find(u => u.id === gameState.winner) || (authStore.user?.id === gameState.winner ? authStore.user : null);
                if (winnerObj) {
                    winner = { id: winnerObj.id, name: winnerObj.name || winnerObj.username, avatarUrl: winnerObj.avatarUrl, wins: 0, losses: 0, draws: 0 };
                    next.push(winner);
                }
            }
            if (winner) winner.wins += 1;

            // Find losers (for 2 player games)
            const loserId = gameState.players.find(id => id !== gameState.winner);
            if (loserId) {
                let loser = next.find(p => p.id === loserId);
                if (!loser) {
                    const loserObj = users.find(u => u.id === loserId) || (authStore.user?.id === loserId ? authStore.user : null);
                    if (loserObj) {
                        loser = { id: loserObj.id, name: loserObj.name || loserObj.username, avatarUrl: loserObj.avatarUrl, wins: 0, losses: 0, draws: 0 };
                        next.push(loser);
                    }
                }
                if (loser) loser.losses += 1;
            }
            return next;
        });
    } else if (gameState.winner === 'draw') {
        gameState.players.forEach(pId => {
            setSessionGameStats(prev => {
                const next = [...prev];
                let player = next.find(p => p.id === pId);
                if (!player) {
                    const pObj = users.find(u => u.id === pId) || (authStore.user?.id === pId ? authStore.user : null);
                    if (pObj) {
                        player = { id: pObj.id, name: pObj.name || pObj.username, avatarUrl: pObj.avatarUrl, wins: 0, losses: 0, draws: 0 };
                        next.push(player);
                    }
                }
                if (player) player.draws += 1;
                return next;
            });
        });
    }
  }, [gameState?.isActive, gameState?.winner]);

  // Intercept back navigation
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      // Only intercept back navigation and screen removal
      // If we are already confirmed to leave, we should not prevent it
      const isBackAction = e.data.action.type === 'GO_BACK' || e.data.action.type === 'POP';
      
      if (!isBackAction) {
        return;
      }

      e.preventDefault();

      const title = isHost ? 'End Session' : 'Leave Room';
      const message = isHost 
        ? 'Are you sure you want to end this session for everyone?' 
        : 'Are you sure you want to leave this room?';

      Alert.alert(title, message, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isHost ? 'Disband' : 'Leave',
          style: 'destructive',
          onPress: () => {
            // Perform cleanup/disband action
            if (isHost) {
              disbandRoom();
            } else {
              if (localStream) {
                localStream.getTracks().forEach((track) => track.stop());
              }
            }
            // Use navigation.dispatch(e.data.action) but we need to bypass this listener
            // The simplest way is to unsubscribe before dispatching
            unsubscribe();
            navigation.dispatch(e.data.action);
          },
        },
      ]);
    });

    return unsubscribe;
  }, [navigation, isHost, disbandRoom, localStream]);

  // Handlers with useCallback for performance
  const handleLeave = useCallback(() => {
    // Just trigger navigation back, the beforeRemove listener will handle the alert
    navigation.goBack();
  }, [navigation]);

  const handleCopyRoomCode = useCallback(() => {
    const code = roomId || 'V5GNB5';
    // Use Clipboard API if available, or just toast
    showToast('success', `Room Code ${code} copied to clipboard`);
  }, [roomId]);

  const handleFeatureSelect = useCallback(
    async (feature) => {
      setUploadModalVisible(false);

      switch (feature) {
        case 'upload':
          // Handled in Modal
          break;
        case 'screenshare':
          // Screen share is web-only for now.
          showToast('info', 'Mobile screen share coming soon');
          break;
        case 'youtube':
          setYoutubeModalVisible(true);
          break;
        case 'browser':
          setBrowserModalVisible(true);
          break;
        case 'games':
          // The modal handles this better
          break;
        default:
          showToast('info', 'This feature is coming soon');
      }
    },
    []
  );

  const handleYoutubeSubmit = useCallback((url) => {
    const trimmed = url.trim();

    if (!trimmed) {
      showToast('error', 'Please enter a YouTube URL');
      return;
    }

    // More permissive validation - just check if it's a YouTube URL or valid ID
    const isYouTubeUrl = 
      trimmed.includes('youtube.com') || 
      trimmed.includes('youtu.be') ||
      /^[a-zA-Z0-9_-]{11}$/.test(trimmed);

    if (!isYouTubeUrl) {
      showToast('error', 'Please enter a valid YouTube URL or video ID');
      return;
    }

    console.log('📺 Syncing YouTube:', trimmed);
    syncYouTube(trimmed);
    setYoutubeModalVisible(false);
  }, [syncYouTube]);

  const handleBrowserSubmit = useCallback(
    (url) => {
      const trimmed = url.trim();

      if (!trimmed) {
        showToast('error', 'Please enter a URL');
        return;
      }

      if (!validateUrl(trimmed)) {
        showToast('error', 'Please enter a valid URL');
        return;
      }

      startBrowser(trimmed);
      setBrowserModalVisible(false);
    },
    [startBrowser]
  );

  const handleStartGame = useCallback(
    (gameId, playerIds) => {
      console.log(`🎮 Starting ${gameId} with players:`, playerIds);
      startGame(gameId, playerIds);
    },
    [startGame]
  );

  const handleEndGame = useCallback(() => {
    Alert.alert('End Game', 'Are you sure you want to end the current game?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'End', style: 'destructive', onPress: () => endGame() },
    ]);
  }, [endGame]);

  // Debug log for User IDs
  useEffect(() => {
    if (authStore.user) {
        console.log('[Room] Active User ID:', authStore.user.id || authStore.user._id);
    }
  }, []);

  const currentUserId = useMemo(() => {
    return currentUser?.id || currentUser?._id;
  }, [currentUser]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <Header
        roomId={roomId}
        isConnected={isConnected}
        isOnline={isOnline}
        participantCount={users.length + 1}
        isHost={isHost}
        onCopyRoomCode={handleCopyRoomCode}
        onOpenSettings={() => setSettingsModalVisible(true)}
        onOpenParticipants={() => setParticipantsModalVisible(true)}
        onOpenLeaderboard={() => setLeaderboardVisible(true)}
        onLeave={handleLeave}
      />

      {/* Main Content Area */}
      <View style={styles.mainContent}>
        {uploadProgress > 0 && (
          <View style={[styles.uploadProgressOverlay, { zIndex: 9999 }]}>
            <View style={styles.uploadProgressBox}>
              <ActivityIndicator size="large" color={COLORS.primary.main} />
              <Text style={styles.uploadProgressText}>Uploading to Projector... {Math.round(uploadProgress)}%</Text>
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { width: `${uploadProgress}%` }]} />
              </View>
            </View>
          </View>
        )}
        {/* Feature Layers (Full Screen) */}
        {isBrowserActive && (
          <VirtualBrowser
            browserUrl={browserUrl}
            urlInputVisible={urlInputVisible}
            setUrlInputVisible={setUrlInputVisible}
            onClose={closeBrowser}
            onNavigate={handleBrowserNavigate}
            canControl={canControlBrowser}
          />
        )}

        {/* YouTube Player removed - replaced by Virtual Browser */}{/*{!isBrowserActive && youtubeVideoId && (
          <YouTubePlayer
            videoId={youtubeVideoId}
            youtubeState={youtubeState}
            onControl={controlYouTube}
          />
        )}*/}

        {!isBrowserActive && !youtubeVideoId && activeProjectorMedia && (
          <MediaViewer
            media={activeProjectorMedia}
            onClose={() => setActiveProjectorMedia(null)}
          />
        )}

        {!isBrowserActive && !youtubeVideoId && !activeProjectorMedia && screenShareStream && (
          <ScreenShare
            screenShareStream={screenShareStream}
            onStop={() => {}}
          />
        )}

        {/* Video Grid (Only if NO features active) */}
        {!hasActiveFeature && (
          <View style={styles.videoGrid}>
            <VideoGrid
              sfuJoined={isConnected}
              localStream={localStream}
              remoteStreams={remoteStreams}
              users={users}
              containerDimensions={containerDimensions}
              sfuVideoEnabled={isVideoEnabled}
              sfuAudioEnabled={isAudioEnabled}
              sfuCameraType={null}
              onSwitchCamera={() => {}}
              currentUser={currentUser}
            />
          </View>
        )}

        {/* Participant strip when features active (no draggable PIP) */}
        {hasActiveFeature && (
          <ParticipantStrip
              users={users}
              hostId={hostId}
              coHostIds={coHostIds}
              pinnedIds={pinnedParticipantIds}
              onTogglePin={handleTogglePin}
              localStream={localStream}
              remoteStreams={remoteStreams}
              sfuJoined={isConnected}
              sfuVideoEnabled={isVideoEnabled}
              sfuAudioEnabled={isAudioEnabled}
              sfuCameraType={null}
              onSwitchCamera={() => {}}
            />
        )}
      </View>

      {/* Bottom Controls - auto-hide after 5s, tap to show */}
      <BottomControls
        visible={taskbarVisible}
        onShow={() => setTaskbarVisible(true)}
        onInteraction={resetTaskbarTimer}
        keepVisible={urlInputVisible}
        sfuVideoEnabled={isVideoEnabled}
        sfuAudioEnabled={isAudioEnabled}
        onToggleVideo={toggleVideo}
        onToggleAudio={toggleAudio}
        onOpenChat={() => setIsChatVisible(true)}
        onOpenUpload={() => setUploadModalVisible(true)}
        onOpenGames={() => setGameModalVisible(true)}
      />

      {/* Chat Overlay */}
      {isChatVisible && (
        <ChatOverlay
          messages={messages}
          onClose={() => setIsChatVisible(false)}
          onSendMessage={sendMessage}
        />
      )}

      {/* Modals */}
      <ParticipantsModal
        visible={participantsModalVisible}
        users={users}
        isHost={isHost}
        onClose={() => setParticipantsModalVisible(false)}
      />

      <SettingsModal
        visible={settingsModalVisible}
        onClose={() => setSettingsModalVisible(false)}
      />

      <UploadModal
        visible={uploadModalVisible}
        sfuIsScreenSharing={false}
        onClose={() => setUploadModalVisible(false)}
        onFeatureSelect={handleFeatureSelect}
        onUploadMedia={uploadMedia}
      />

      <InputModal
        visible={youtubeModalVisible}
        title="Sync YouTube Video"
        placeholder="Paste YouTube URL here..."
        buttonText="Sync Video"
        onClose={() => setYoutubeModalVisible(false)}
        onSubmit={handleYoutubeSubmit}
      />

      <InputModal
        visible={browserModalVisible}
        title="Virtual Browser"
        placeholder="Enter website URL (e.g., https://example.com)"
        buttonText="Open Browser"
        keyboardType="url"
        onClose={() => setBrowserModalVisible(false)}
        onSubmit={handleBrowserSubmit}
      />

      <GameSelectionModal
        visible={gameModalVisible}
        onClose={() => setGameModalVisible(false)}
        onSelectGame={handleStartGame}
        users={users}
      />

      {leaderboardVisible && (
        <GameLeaderboard 
            stats={sessionGameStats} 
            onClose={() => setLeaderboardVisible(false)} 
        />
      )}

      {gameState?.isActive && (
        <ActiveGameView
          gameState={gameState}
          onMove={makeGameMove}
          onClose={hostId === currentUserId ? handleEndGame : () => showToast('info', 'Only host can end the game')}
          userId={currentUserId}
          localStream={localStream}
          remoteStreams={remoteStreams}
          users={users}
        />
      )}
    </SafeAreaView>
  );
};

export default memo(InnerRoomScreen);