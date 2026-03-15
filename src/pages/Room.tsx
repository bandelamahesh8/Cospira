import { Suspense, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { safeLazy } from '@/components/AnimatedRoutes';
import {
  Shield,
  VideoOff,
  Users,
  Lock,
  Building2,
  Eye,
  LayoutGrid,
  Globe,
  User,
  Bot,
  Sparkles,
  Settings,
  Ghost,
  BarChart3,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useWebSocket } from '@/hooks/useWebSocket';
import { PollData } from '@/types/websocket';
import { ParticipantStrip } from '@/components/room/ParticipantStrip';
import { useAuth } from '@/hooks/useAuth';
import { useRecording } from '@/hooks/useRecording';
import { useRoom } from '@/hooks/useRoom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useOrganization } from '@/contexts/useOrganization';
import { copyToClipboard } from '@/utils/clipboard';
const RoomControls = safeLazy(() => import('@/components/room/RoomControls'));
const VideoGrid = safeLazy(() => import('@/components/room/VideoGrid'));
const ChatPanel = safeLazy(() => import('@/components/room/ChatPanel'));
const VirtualBrowser = safeLazy(() => import('@/components/VirtualBrowser').then(m => ({ default: m.VirtualBrowser })));
const SoftOnboarding = safeLazy(() => import('@/components/room/SoftOnboarding').then(m => ({ default: m.SoftOnboarding })));
const CaptionsOverlay = safeLazy(() => import('@/components/room/CaptionsOverlay').then(m => ({ default: m.CaptionsOverlay })));
const RoomModeSuggestion = safeLazy(() => import('@/components/room/RoomModeSuggestion'));
const LateJoinBanner = safeLazy(() => import('@/components/room/LateJoinBanner'));
const InviteModal = safeLazy(() => import('@/components/room/InviteModal'));
const AIPoll = safeLazy(() => import('@/components/room/AIPoll'));
const ManualPollModal = safeLazy(() => import('@/components/room/ManualPollModal'));
const AuthPromptModal = safeLazy(() => import('@/components/room/AuthPromptModal').then(m => ({ default: m.AuthPromptModal })));
const RoomTimerModal = safeLazy(() => import('@/components/room/RoomTimerModal').then(m => ({ default: m.RoomTimerModal })));
const DispatchModal = safeLazy(() => import('@/components/room/DispatchModal'));
const SuperiorSummaryModal = safeLazy(() => import('@/components/room/SuperiorSummaryModal'));
const ParticipantsModal = safeLazy(() => import('@/components/room/ParticipantsModal'));
const SynchronizedYouTubePlayer = safeLazy(() => import('@/components/SynchronizedYouTubePlayer'));
const OTTGridModal = safeLazy(() => import('@/components/OTTGridModal'));
const GameHubModal = safeLazy(() => import('@/components/games/GameSelector').then(m => ({ default: m.GameHubModal })));
const AbandonGameModal = safeLazy(() => import('@/components/games/GameSelector').then(m => ({ default: m.AbandonGameModal })));
const GameArenaContainer = safeLazy(() => import('@/components/games/GameArenaContainer').then(m => ({ default: m.GameArenaContainer })));
const FeedbackModal = safeLazy(() => import('@/components/FeedbackModal'));
const SettingsModal = safeLazy(() => import('@/components/SettingsModal'));
const SecurityDecryptionModal = safeLazy(() => import('@/components/room/SecurityDecryptionModal').then(m => ({ default: m.SecurityDecryptionModal })));
const TranscriptionOverlay = safeLazy(() => import('@/components/room/TranscriptionOverlay').then(m => ({ default: m.TranscriptionOverlay })));
const RoomsGridView = safeLazy(() => import('@/components/room/RoomsGridView'));
const HeaderTimer = safeLazy(() => import('@/components/room/HeaderTimer'));
const SecurityOverlay = safeLazy(() => import('@/components/room/SecurityOverlay').then(m => ({ default: m.SecurityOverlay })));
const FilePresenter = safeLazy(() => import('@/components/room/FilePresenter').then(m => ({ default: m.FilePresenter })));
import { useFullscreenEnforcement } from '@/hooks/useFullscreenEnforcement';
import { UltraSecureBlocker } from '@/components/room/UltraSecureBlocker';
import { KeyWarningOverlay } from '@/components/room/KeyWarningOverlay';

import { useNavigate, useLocation } from 'react-router-dom';
import { BreakoutService } from '@/services/BreakoutService';
import { getModeConfig, type RoomMode } from '@/services/RoomIntelligence';
import AITimer from '@/components/room/AITimer';
import { RoomSkeleton } from '@/components/room/RoomSkeleton';
import SocialRoomControls from '@/components/room/SocialRoomControls';
import { useNetworkQuality, NetworkQuality } from '@/hooks/useNetworkQuality';
import { UI_TEXT } from '@/utils/terminology';

const Room = () => {
  const {
    roomId,
    newMessage,
    setNewMessage,
    isUploading,
    showChat,
    setShowChat,
    showOTTModal,
    setShowOTTModal,
    showStopShareConfirm,
    setShowStopShareConfirm,
    showDisbandConfirm,
    setShowDisbandConfirm,
    messagesEndRef,
    fileInputRef,
    handleSendMessage,
    handleFileUpload,
    triggerFileUpload,
    handleLeaveRoom,
    handleToggleScreenShare,
    confirmStopShare,
    isFeedbackOpen,
    setIsFeedbackOpen,
    hasJoined,
    joinExplicitlyRequested,
    requestJoin,
  } = useRoom();

  const {
    socket,
    messages,
    users,
    files,
    isHost,
    isSuperHost,
    isConnected,
    roomName,
    organizationName,
    disbandRoom,

    presentFile,
    presentFileFromUpload,
    localStream,
    localScreenStream,
    remoteStreams,
    remoteScreenStreams,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    toggleAudio,
    toggleVideo,
    repairMedia,
    isPresentingFile,
    presentedFile,
    closePresentedFile,
    youtubeVideoId,
    youtubeCurrentTime,
    startYoutubeVideo,
    // isMediaLoading, // Handled locally via isInitialLoading
    waitingUsers,
    isWaiting,

    stopYoutubeVideo,
    gameState,
    isVirtualBrowserActive,
    startVirtualBrowser,
    effectiveUserId,
    meetingSummary,
    activeTimer,
    startRoomTimer,
    pauseRoomTimer,
    resumeRoomTimer,
    stopRoomTimer,
    activePoll,
    lateJoinSummary,
    roomMode,
    roomModeConfig,
    roomStatus,
    leaveRoom,
    endSession,
    roomCreatedAt,
    isRoomLocked,
    accessType,
    checkRoom,
    isGhost,
  } = useWebSocket();

  const [isPollDismissed, setIsPollDismissed] = useState(false);
  const prevPollId = useRef<string | null>(null);

  useEffect(() => {
    if (activePoll && activePoll.id !== prevPollId.current) {
      setIsPollDismissed(false);
      prevPollId.current = activePoll.id;
    }
  }, [activePoll]);

  const activeMode = (roomMode || 'mixed') as RoomMode;
  const activeConfig = getModeConfig(activeMode);

  const navigate = useNavigate();
  const location = useLocation();
  const { user: authUser } = useAuth();
  const { organizations, currentOrganization, setCurrentOrganization } = useOrganization();
  const { isRecording, startRecording, stopRecording } = useRecording();

  const [unreadCount, setUnreadCount] = useState(0);
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const prevMessagesLengthRef = useRef(messages.length);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const mediaLoadTimeout = useRef<NodeJS.Timeout>();

  // Elite-tier UI state
  const [showStatusBanner, setShowStatusBanner] = useState(true);
  const [showManualPollModal, setShowManualPollModal] = useState(false);
  const [pollHistory, setPollHistory] = useState<PollData[]>([]);

  const fetchPollHistory = useCallback(() => {
    if (!socket || !roomId) return;
    socket.emit('get-poll-history', { roomId }, (res: { success: boolean, history?: PollData[], error?: string }) => {
      if (res.success && res.history) {
        setPollHistory(res.history);
      } else if (res.error) {
        toast.error('History Error', { description: res.error });
      }
    });
  }, [socket, roomId]);
  const [shortcutHint, setShortcutHint] = useState<string | null>(null);
  const [shortcutUsed, setShortcutUsed] = useState<Set<string>>(new Set());
  const [showSuperiorSummary, setShowSuperiorSummary] = useState(false);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [showGameHub, setShowGameHub] = useState(false);
  const [showAbandonModal, setShowAbandonModal] = useState(false);
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [viewMode, setViewMode] = useState<'single' | 'grid'>('single');
  const [showViewMenu, setShowViewMenu] = useState(false);
  const [isBrowserStarting, setIsBrowserStarting] = useState(false); // bridges click → isVirtualBrowserActive gap
  const [isBreakoutRoom, setIsBreakoutRoom] = useState(false);

  // Ghost Observer Mode Toggle
  const [localGhostToggle, setLocalGhostToggle] = useState<boolean | null>(null);

  // Ghost Observer Mode — either from URL param (initial/pending), Context (confirmed) or Local Override
  const isGhostMode = useMemo(() => {
    if (localGhostToggle !== null) return localGhostToggle;
    if (isGhost) return true;
    const params = new URLSearchParams(location.search);
    return params.get('ghost') === 'true';
  }, [location.search, isGhost, localGhostToggle]);

  const handleToggleGhost = useCallback(() => {
    const newGhostState = !isGhostMode;
    setLocalGhostToggle(newGhostState);
    
    if (newGhostState) {
      if (isAudioEnabled) toggleAudio();
      if (isVideoEnabled) toggleVideo();
      toast.success('Ghost Mode Activated', { description: 'You are now invisible to participants.' });
    } else {
      toast.success('Ghost Mode Deactivated', { description: 'You are no longer hidden.' });
    }
  }, [isGhostMode, isAudioEnabled, toggleAudio, isVideoEnabled, toggleVideo]);

  const [preFetchedRoomInfo, setPreFetchedRoomInfo] = useState<{
    organizationName?: string | null;
    organization_name?: string | null;
    settings?: { organizationName?: string | null };
    name?: string;
    hostName?: string | null;
    success?: boolean;
    requiresPassword?: boolean;
  } | null>(null);

  // Pre-fetch room info when not joined
  useEffect(() => {
    if (roomId && !hasJoined && !isWaiting) {
      checkRoom(roomId).then((info) => {
        if (info.success) {
          setPreFetchedRoomInfo(info);
        }
      });
    }
  }, [roomId, hasJoined, isWaiting, checkRoom]);
  
  // Auto-decrypt if no password is required (prevents stuck screen in Ultra Secure mode)
  useEffect(() => {
    if (preFetchedRoomInfo?.success && preFetchedRoomInfo?.requiresPassword === false) {
      setIsDecrypted(true);
    }
  }, [preFetchedRoomInfo]);
  useEffect(() => {
    if (roomId && organizations.length > 0) {
      const params = new URLSearchParams(location.search);
      const isExplicitOrg = params.get('type') === 'org';

      // Check if roomId is an ID or a Slug
      const org = organizations.find((o) => o.id === roomId || o.slug === roomId);
      
      if (org && isExplicitOrg) {
        // Only auto-select org if it's explicitly an org room via URL param
        setCurrentOrganization(org);
        setIsBreakoutRoom(false);
      } else {
        // Secondary check: is it a breakout room? By definition these must be valid UUIDs
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          roomId
        );

        if (isUUID) {
          BreakoutService.getBreakoutDetails(roomId)
            .then((breakout) => {
              if (breakout && breakout.organization_id) {
                setIsBreakoutRoom(true);
                const parentOrg = organizations.find((o) => o.id === breakout.organization_id);
                if (parentOrg) {
                  setCurrentOrganization(parentOrg);
                }
              } else {
                setIsBreakoutRoom(false);
                // Don't clear if it was set by organizationName from socket (legacy)
                if (!organizationName) setCurrentOrganization(null); 
              }
            })
            .catch((err) => {
              console.error('[Room] Error resolving breakout details:', err);
              setIsBreakoutRoom(false);
              if (!organizationName) setCurrentOrganization(null);
            });
        } else {
          setIsBreakoutRoom(false);
          // If not an explicit org room and not a breakout, clear the org context
          // but allow organizationName from socket to persist for metadata display
          if (!organizationName) setCurrentOrganization(null);
        }
      }
    }
  }, [roomId, organizations, setCurrentOrganization, location.search, organizationName]);

  const isMainOrgRoom = useMemo(() => {
    if (!currentOrganization || !roomId) return false;
    const isMatchingId = roomId === currentOrganization.id || roomId === currentOrganization.slug;
    const params = new URLSearchParams(location.search);
    // Only treat as Main Org Room if we have the explicit type=org flag
    // This prevents standalone private rooms from accidentally showing the org waiting lobby
    return isMatchingId && params.get('type') === 'org';
  }, [currentOrganization, roomId, location.search]);

  // Derived State from Mode Config
  const isUltraSecure = activeConfig.securityLevel === 'high';

  // Fullscreen Enforcement for Ultra Secure Mode - Bypass for Hosts
  const isSecurityEnforced = useMemo(() => {
    return hasJoined && isUltraSecure && !isHost && !isSuperHost;
  }, [hasJoined, isUltraSecure, isHost, isSuperHost]);

  const { 
    chances: securityChances, 
    keyChances,
    isBlocked: isSecurityBlocked, 
    isKeyWarningVisible,
    pressedKey,
    requestFullscreen 
  } = useFullscreenEnforcement(isSecurityEnforced, (key) => {
    if (socket) {
      socket.emit('security:suspicious-activity', {
        roomId,
        reason: `User exhausted key warnings (Last blocked key: ${key})`
      });
    }
  });

  // Ultra Security Decryption State
  const [isDecrypted, setIsDecrypted] = useState(!isUltraSecure);

  // AI Intelligence State
  const [transcript, setTranscript] = useState('');
  const [isTranscriptFinal, setIsTranscriptFinal] = useState(false);

  // Sync local transcript with WebSocket context
  const { lastTranscript } = useWebSocket();
  useEffect(() => {
    if (lastTranscript) {
      setTranscript(lastTranscript.text);
      setIsTranscriptFinal(lastTranscript.isFinal);
    }
  }, [lastTranscript]);

  /* Removed duplicate STTService.init/start logic - handled by WebSocketContext */

  const handleGenerateSummary = useCallback(() => {
    if (!activeConfig.features.aiSummary) return;
    setShowSuperiorSummary(true);
  }, [activeConfig.features.aiSummary]);

  useEffect(() => {
    // If switching TO ultra mode dynamically, re-lock?
    if (isUltraSecure && !isDecrypted) {
      // Keep locked
    } else if (!isUltraSecure && !isDecrypted) {
      setIsDecrypted(true);
    }

    // Content Protection (Screenshot Blocking) via Tauri - Only for non-hosts
    const setWindowProtection = async (protected_mode: boolean) => {
      // Robust check for Tauri environment
      const isTauri = !!(window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
      if (!isTauri) return;

      try {
        const core = await import('@tauri-apps/api/core');
        if (core && core.invoke) {
          await core.invoke('set_window_protection', { protected: protected_mode });
        }
      } catch (err) {
        // Silently fail in browser/non-Tauri environments
        if (protected_mode) {
          console.warn('Failed to engage content protection:', err);
        }
      }
    };

    if (isSecurityEnforced) {
      setWindowProtection(true).catch(err => {
        console.error('Security Protocol Error:', err);
        toast.error('Security Protocol Error', { 
          description: 'Failed to engage OS-level screenshot blocking.' 
        });
      });
    } else {
      setWindowProtection(false);
    }

    // Cleanup protection on unmount or mode switch
    return () => {
      setWindowProtection(false);
    };
  }, [isSecurityEnforced, isUltraSecure, isDecrypted]); 

  // Global "Secure Mask" for immediate blackout during screenshot attempts - Only for non-hosts
  const [isMaskActive, setIsMaskActive] = useState(false);
  useEffect(() => {
    if (!isSecurityEnforced || isKeyWarningVisible === false) return;
    
    // If PrtSc or other sensitive keys are pressed, blackout for 300ms
    if (pressedKey === 'PrintScreen' || pressedKey === 'PrtSc') {
      setIsMaskActive(true);
      const timer = setTimeout(() => setIsMaskActive(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isSecurityEnforced, isKeyWarningVisible, pressedKey]);

  const modeTheme = useMemo(() => {
    switch (activeMode) {
      case 'fun':
        return {
          bg: 'bg-[#0F0B14]',
          accentColor: '#D946EF', // Cospira Purple
          accentClass: 'text-fuchsia-500',
          borderClass: 'border-fuchsia-500/20',
          selection: 'selection:bg-fuchsia-500',
          shadow: 'shadow-fuchsia-500/20',
        };
      case 'professional':
        return {
          bg: 'bg-[#0B0F14]',
          accentColor: '#3B82F6', // Blue
          accentClass: 'text-blue-500',
          borderClass: 'border-blue-500/20',
          selection: 'selection:bg-blue-500',
          shadow: 'shadow-blue-500/20',
        };
      case 'ultra':
        return {
          bg: 'bg-[#050000]',
          accentColor: '#EF4444', // Red
          accentClass: 'text-red-500',
          borderClass: 'border-red-500/30',
          selection: 'selection:bg-red-500',
          shadow: 'shadow-red-500/30',
        };
      case 'mixed':
      default:
        return {
          bg: 'bg-[#0B0F14]',
          accentColor: '#10B981', // Emerald
          accentClass: 'text-emerald-500',
          borderClass: 'border-white/5',
          selection: 'selection:bg-emerald-500',
          shadow: 'shadow-emerald-500/20',
        };
    }
  }, [activeMode]);

  // Guest Auth Prompt Logic
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [authPromptTrigger, setAuthPromptTrigger] = useState<
    'microphone' | 'camera' | 'chat' | 'summary' | 'timer'
  >('timer');
  const [, setGuestInteractionCount] = useState({ mic: 0, camera: 0, chat: 0 });
  const hasShownLateJoinPrompt = useRef(false);

  // Clear the "browser starting" overlay once the panel is truly active
  useEffect(() => {
    if (isVirtualBrowserActive) {
      setIsBrowserStarting(false);
    }
  }, [isVirtualBrowserActive]);

  // Wrapped startVirtualBrowser — gives immediate visual feedback
  const handleStartVirtualBrowser = useCallback(
    (url: string) => {
      setIsBrowserStarting(true);
      startVirtualBrowser(url);
    },
    [startVirtualBrowser]
  );

  // --- Social Mode Logic (Phase 3) ---
  const isSocialRoom = roomId?.startsWith('cnt-');
  const isSocialMode = !!isSocialRoom || (activeMode as string) === 'social';

  // Safety Force
  // const cameraWarningState = 'safe';
  // const isMediaLoading = false;

  // Override activeMode display for UI consistency in social rooms
  const displayMode = isSocialMode ? 'social' : activeMode;

  const socialState = location.state as { socialIntent: string; socialLanguage: string } | null;

  // --- Social Mode Camera Enforcement ---
  const [cameraWarningState, setCameraWarningState] = useState<'safe' | 'warning' | 'critical'>(
    'safe'
  );
  useEffect(() => {
    if (!isSocialMode || !isConnected) return;

    let warningTimeout: NodeJS.Timeout;
    let kickTimeout: NodeJS.Timeout;

    if (!isVideoEnabled) {
      // Camera turned off! Start timers.
      setCameraWarningState('warning');

      warningTimeout = setTimeout(() => {
        setCameraWarningState('critical');
      }, 5000); // Critical warning after 5s

      kickTimeout = setTimeout(() => {
        handleLeaveRoom();
        navigate('/connect');
        toast.error('Removed: Camera rule violation.');
      }, 15000); // Kick after 15s
    } else {
      // Camera is on, reset everything
      setCameraWarningState('safe');
    }

    return () => {
      clearTimeout(warningTimeout);
      clearTimeout(kickTimeout);
    };
  }, [isSocialMode, isConnected, isVideoEnabled, handleLeaveRoom, navigate]);

  // --- Media Loading State ---

  useEffect(() => {
    mediaLoadTimeout.current = setTimeout(() => {
      setIsInitialLoading(false);
    }, 2000); // Reduced to 2s for faster load

    return () => {
      if (mediaLoadTimeout.current) clearTimeout(mediaLoadTimeout.current);
    };
  }, []);

  // Lazy media: Do NOT auto-enable on join. Media is acquired only when user
  // explicitly turns on camera or microphone via toggle. This prevents the
  // "camera auto on/off" and "running in background" behavior.

  // Handle force disconnect from server (report or safety violation)
  useEffect(() => {
    if (!socket) return;
    socket.on('force_disconnect', (data: { reason: string }) => {
      toast.error(data.reason || 'Connection terminated.');
      handleLeaveRoom();
      navigate('/connect');
    });
    return () => {
      socket.off('force_disconnect');
    };
  }, [socket, handleLeaveRoom, navigate]);

  const [isSearching, setIsSearching] = useState(false);

  interface ExtendedLocationState {
    socialIntent?: string;
    socialLanguage?: string;
    interests?: string[];
    connectionType?: 'text' | 'video';
  }

  const extendedState = location.state as ExtendedLocationState;
  // Retrieve extended state for re-queueing
  const queueInterests = useMemo(() => extendedState?.interests || [], [extendedState?.interests]);
  const queueConnectionType = extendedState?.connectionType || 'video';

  useEffect(() => {
    if (!socket) return;
    const onMatchFound = ({ roomId: newRoomId }: { roomId: string }) => {
      if (isSearching) {
        navigate(`/room/${newRoomId}`, {
          state: {
            socialIntent: socialState?.socialIntent,
            socialLanguage: socialState?.socialLanguage,
            interests: queueInterests,
            connectionType: queueConnectionType,
          },
        });
        setIsSearching(false);
      }
    };
    socket.on('match_found', onMatchFound);
    return () => {
      socket.off('match_found', onMatchFound);
    };
  }, [socket, isSearching, navigate, socialState, queueInterests, queueConnectionType]);

  const handleSocialNext = useCallback(() => {
    setIsSearching(true);
    leaveRoom({ keepMedia: true }); // Use direct socket leave to avoid feedback modal from useRoom hook
    setTimeout(() => {
      if (socket) {
        socket.emit('join_random_queue', {
          intent: socialState?.socialIntent || 'casual',
          language: socialState?.socialLanguage || 'english',
          interests: queueInterests,
          connectionType: queueConnectionType,
        });
      }
    }, 300);
  }, [socket, socialState, queueInterests, queueConnectionType, leaveRoom, setIsSearching]);

  const handleSocialReport = () => {
    if (socket) {
      socket.emit('report_user', { roomId, reason: 'User Report' });
      toast.error('User Reported', {
        description: 'Our safety team has been notified. Interaction logs secured.',
      });
    }
    // Client-side leave is handled by the server's force_disconnect response usually,
    // but for perceived speed we can also trigger leave, though waiting for server confirmation is safer to ensure report is sent.
    // We'll rely on the server's 'force_disconnect' or just leave immediately after emit to be safe.
    // Let's leave immediately for user psychological safety.
    handleLeaveRoom();
    navigate('/connect');
  };

  // --- Speed Psychology (Phase 7): Skeleton Loading ---
  const [showSkeleton, setShowSkeleton] = useState(false); // Default false to avoid blank screen risk

  useEffect(() => {
    if (isConnected) {
      // Artificial minimal delay to prevent flicker, but primarily wait for connection
      const timer = setTimeout(() => setShowSkeleton(false), 500); // 500ms progressive reveal
      return () => clearTimeout(timer);
    }
  }, [isConnected]);

  // Timer Trigger (3 mins)
  useEffect(() => {
    if (!authUser && !isHost && isConnected) {
      const timer = setTimeout(() => {
        setAuthPromptTrigger('timer');
        setAuthPromptOpen(true);
      }, 180000); // 3 minutes
      return () => clearTimeout(timer);
    }
  }, [authUser, isHost, isConnected]);

  // Wrappers for triggers
  const wrappedToggleAudio = useCallback(() => {
    toggleAudio();
    if (!authUser) {
      setGuestInteractionCount((prev) => {
        const newCount = prev.mic + 1;
        if (newCount === 3) {
          setAuthPromptTrigger('microphone');
          setAuthPromptOpen(true);
        }
        return { ...prev, mic: newCount };
      });
    }
  }, [toggleAudio, authUser]);

  const wrappedHandleSendMessage = useCallback(
    (e: React.FormEvent) => {
      handleSendMessage(e);
      if (!authUser) {
        setGuestInteractionCount((prev) => {
          const newCount = prev.chat + 1;
          if (newCount === 5) {
            // Prompt after 5 messages
            setAuthPromptTrigger('chat');
            setAuthPromptOpen(true);
          }
          return { ...prev, chat: newCount };
        });
      }
    },
    [handleSendMessage, authUser]
  );

  const wrappedToggleVideo = useCallback(() => {
    toggleVideo();
    if (!authUser) {
      setGuestInteractionCount((prev) => {
        const newCount = prev.camera + 1;
        if (newCount === 3) {
          setAuthPromptTrigger('camera');
          setAuthPromptOpen(true);
        }
        return { ...prev, camera: newCount };
      });
    }
  }, [toggleVideo, authUser]);

  const wrappedGenerateSummary = useCallback(
    (_options?: { broadcast?: boolean }) => {
      if (!authUser) {
        setAuthPromptTrigger('summary');
        setAuthPromptOpen(true);
        return;
      }
      handleGenerateSummary();
    },
    [authUser, handleGenerateSummary]
  );

  // Auto-open summary when generated
  useEffect(() => {
    if (meetingSummary && activeConfig.features.aiSummary) {
      setShowSuperiorSummary(true);
    }
  }, [meetingSummary, activeConfig.features.aiSummary]);

  // Auto-re-match logic for Social Mode
  useEffect(() => {
    if (isSocialMode && users.length === 1 && !isSearching) {
      const timer = setTimeout(() => {
        handleSocialNext();
      }, 2000); // 2 second delay before auto-next
      return () => clearTimeout(timer);
    }
  }, [isSocialMode, users.length, isSearching, handleSocialNext]);

  // Handle room mode configuration
  useEffect(() => {
    setShowStatusBanner(true);
  }, [roomModeConfig]);

  // Late Join / Catch Up Prompt
  useEffect(() => {
    // If we are a guest/participant (not host), and we just joined...
    // We can check if there's any existing context.
    // For now, let's just show it if we are not the host to encourage usage.
    // A better check would be seeing if `messages` or `transcripts` exist, but we don't have transcripts in client state until pushed.

    // Hide in Social Mode (Random Match)
    if (isConnected && !isHost && !isWaiting && !isSocialMode && !hasShownLateJoinPrompt.current) {
      const timer = setTimeout(() => {
        if (hasShownLateJoinPrompt.current) return; // Double check inside timeout
        hasShownLateJoinPrompt.current = true;
        toast.info('Joined Late?', {
          description: 'Generate a private summary to catch up on what you missed.',
          action: (
            <Button
              variant='outline'
              size='sm'
              onClick={() => wrappedGenerateSummary({ broadcast: false })}
              className='bg-purple-500/20 border-purple-500/50 hover:bg-purple-500/30 text-purple-200'
            >
              Catch Up
            </Button>
          ),
          duration: 10000,
        });
      }, 4000); // Wait 4s after join
      return () => clearTimeout(timer);
    }
  }, [isConnected, isHost, isWaiting, wrappedGenerateSummary, isSocialMode]);

  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current) {
      if (!showChat) {
        setUnreadCount((prev) => prev + 1);
      }
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages, showChat]);

  useEffect(() => {
    if (showChat) {
      setUnreadCount(0);
    }
  }, [showChat]);

  // Status banner auto-hide after 2s
  useEffect(() => {
    const timer = setTimeout(() => setShowStatusBanner(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  // Keyboard shortcuts with first-use hints
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't trigger if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const key = e.key.toLowerCase();

      switch (key) {
        case 'm':
          wrappedToggleAudio();
          if (!shortcutUsed.has('m')) {
            setShortcutHint('Press M to mute');
            setShortcutUsed((prev) => new Set(prev).add('m'));
            setTimeout(() => setShortcutHint(null), 2000);
          }
          break;
        case 'v':
          toggleVideo();
          if (!shortcutUsed.has('v')) {
            setShortcutHint('Press V to toggle camera');
            setShortcutUsed((prev) => new Set(prev).add('v'));
            setTimeout(() => setShortcutHint(null), 2000);
          }
          break;
        case 's':
          handleToggleScreenShare();
          if (!shortcutUsed.has('s')) {
            setShortcutHint('Press S to share screen');
            setShortcutUsed((prev) => new Set(prev).add('s'));
            setTimeout(() => setShortcutHint(null), 2000);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [wrappedToggleAudio, toggleVideo, handleToggleScreenShare, shortcutUsed]);

  // Network Quality Feedback (Trust Through Transparency)
  const { quality: netQuality } = useNetworkQuality();
  const prevNetQuality = useRef<NetworkQuality>(netQuality);

  useEffect(() => {
    if (prevNetQuality.current !== netQuality) {
      if (netQuality === 'poor') {
        toast.warning('Network Unstable', {
          description: "We've optimized audio to keep you connected.",
          duration: 5000,
        });
      } else if (netQuality === 'offline') {
        toast.error('Connection Lost', {
          description: 'Attempting to reconnect...',
          duration: Infinity,
          id: 'offline-toast', // Prevent duplicates
        });
      } else if (prevNetQuality.current === 'offline') {
        toast.dismiss('offline-toast');
        toast.success('Back Online', { description: 'Connection restored.' });
      }
      prevNetQuality.current = netQuality;
    }
  }, [netQuality]);

  if (!isConnected || showSkeleton) {
    return <RoomSkeleton />;
  }

  if (isWaiting && isMainOrgRoom) {
    return (
      <div className='min-h-screen bg-[#0B0F14] flex items-center justify-center p-6'>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className='max-w-md w-full'
        >
          <Card className='luxury-card bg-[#11161D] border-white/5 p-10 rounded-[3rem] overflow-hidden relative'>
            <div className='absolute top-0 right-0 p-10 opacity-5'>
              <Shield className='w-48 h-48 -rotate-12 translate-x-20 -translate-y-20' />
            </div>
            <CardHeader className='p-0 mb-10 text-center'>
              <div className='w-20 h-20 bg-amber-500/10 border border-amber-500/20 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-[0_0_30px_rgba(245,158,11,0.2)]'>
                <Shield className='w-10 h-10 text-amber-500' />
              </div>
              <CardTitle className='text-4xl font-black uppercase italic tracking-tighter mb-4'>
                Security Barrier
              </CardTitle>
              <CardDescription className='text-slate-400 font-medium'>
                Request Transmitted. Waiting for host to accept...
              </CardDescription>
            </CardHeader>
            <CardContent className='p-0 flex flex-col items-center gap-8'>
              <div className='relative h-20 w-20'>
                <div className='absolute inset-0 rounded-full border-2 border-white/5'></div>
                <div className='absolute inset-0 rounded-full border-2 border-amber-500 border-t-transparent animate-spin'></div>
              </div>
              <button
                onClick={handleLeaveRoom}
                className='w-full h-16 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] text-white hover:bg-white/10 transition-all'
              >
                Terminate Session
              </button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  const hasScreenShare = localScreenStream || remoteScreenStreams.size > 0;
  const isPresentationMode =
    hasScreenShare ||
    isPresentingFile ||
    !!youtubeVideoId ||
    gameState?.isActive ||
    isVirtualBrowserActive ||
    isBrowserStarting ||
    Array.from(remoteScreenStreams.values()).some(s => s !== null);
  const currentUser = users.find((u) => u.id === (authUser?.id || effectiveUserId));
  const canShareScreen = isHost || currentUser?.isCoHost || false;
  const localUserName = currentUser?.name || authUser?.user_metadata?.display_name || 'You';

  return (
    <div
      className={`min-h-[100dvh] ${modeTheme.bg} text-white flex flex-col overflow-hidden ${modeTheme.selection} selection:text-background font-sans transition-colors duration-700 ${isUltraSecure ? 'select-none pointer-events-auto' : ''}`}
      style={{ '--primary': modeTheme.accentColor } as React.CSSProperties}
      onContextMenu={(e) => isUltraSecure && e.preventDefault()} // Disable right-click in Ultra
    >
      {/* Ultra Security Decryption Modal */}
      <SecurityDecryptionModal
        isOpen={isUltraSecure && !isDecrypted}
        roomId={roomId || 'UNKNOWN'}
        onDecrypt={() => setIsDecrypted(true)}
      />

      {/* ── Ghost Observer HUD ─────────────────────────────────────────────── */}
      {/* Shown only when Super Host joins with ?ghost=true — invisible to participants */}
      <AnimatePresence>
        {isGhostMode && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className='fixed top-20 left-4 z-[200] pointer-events-none select-none'
          >
            <div className='flex flex-col gap-1.5'>
              {/* Main ghost badge */}
              <div className='flex items-center gap-2 px-3 py-2 rounded-2xl bg-purple-950/80 border border-purple-500/30 backdrop-blur-md shadow-xl shadow-purple-900/30'>
                <div className='relative'>
                  <Ghost className='w-4 h-4 text-purple-400' />
                  <span className='absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-purple-400 animate-pulse' />
                </div>
                <div>
                  <p className='text-[10px] font-black uppercase tracking-[0.2em] text-purple-300'>
                    Ghost Observer
                  </p>
                  <p className='text-[8px] font-medium text-purple-400/60 uppercase tracking-widest'>
                    Invisible to participants
                  </p>
                </div>
              </div>
              {/* Subtle scanning line animation */}
              <div className='h-px w-full bg-gradient-to-r from-transparent via-purple-500/40 to-transparent animate-pulse' />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Virtual Browser Startup Overlay — shown immediately on click, before panel appears */}
      <AnimatePresence>
        {isBrowserStarting && !isVirtualBrowserActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className='fixed inset-0 z-[150] bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center gap-6 pointer-events-none'
          >
            <div className='relative w-20 h-20 flex items-center justify-center'>
              <div className='absolute inset-0 rounded-full border-2 border-blue-500/20' />
              <div className='absolute inset-0 rounded-full border-2 border-blue-500 border-t-transparent animate-spin' />
              <div className='absolute inset-3 rounded-full bg-blue-500/10 animate-pulse' />
              <Globe className='w-7 h-7 text-blue-400 relative z-10' />
            </div>
            <div className='text-center'>
              <p className='text-sm font-black uppercase tracking-[0.25em] text-white'>
                Starting Virtual Browser
              </p>
              <p className='text-[10px] font-mono text-slate-500 mt-1 animate-pulse tracking-widest'>
                INITIALISING BROWSER ENGINE...
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ultra-Luxury Navbar - 10/10 Plan (LOCKED) */}
      <motion.header
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={`h-[56px] md:h-[64px] border-b ${modeTheme.borderClass} luxury-glass px-4 md:px-6 flex items-center justify-between shrink-0 z-[100] safe-top relative ${modeTheme.bg}/95 transition-all duration-700`}
      >
        {/* 1. LEFT ZONE: CONTEXT INDICATOR (Timer / Protocol Status) */}
        <div className='flex items-center gap-3 relative flex-1 basis-0'>
          {/* Manage button — Refined Premium Style */}
          {currentOrganization && ((isHost && isMainOrgRoom) || currentUser?.isSuperHost) && (
            <button
              onClick={() => setShowDispatchModal(true)}
              className='flex items-center gap-2 h-9 px-3.5 rounded-xl bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 hover:border-indigo-500/40 text-indigo-300 text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap shadow-lg active:scale-95'
            >
              <Building2 className='w-3.5 h-3.5 shrink-0 opacity-70' />
              <span className='hidden md:inline'>Manage Session</span>
            </button>
          )}
          {/* Header timer */}
          <HeaderTimer
            activeTimer={activeTimer}
            joinedAt={roomCreatedAt}
            status={roomStatus}
            onClick={() => isHost && setShowTimerModal(true)}
            isHost={isHost}
            onPause={pauseRoomTimer}
            onResume={resumeRoomTimer}
            onStop={stopRoomTimer}
            compact={!!(isHost && currentOrganization && isMainOrgRoom)}
          />
        </div>

        {/* 2. CENTER ZONE: HERO STATUS (True Screen Center Alignment) */}
        <div className='absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center overflow-visible min-w-max'>
          {/* Top Row: IDENTITY */}
          <div className='flex items-center justify-center gap-3 relative'>
            {/* Hanging LIVE indicator (Doesn't offset text centering) */}
            <div className='flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/5 border border-red-500/10'>
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className='w-1.5 h-1.5 rounded-full bg-[#EF4444] shadow-[0_0_8px_rgba(239,68,68,0.4)]'
              />
              <span className='text-[9px] font-black text-[#EF4444] uppercase tracking-widest leading-none hidden sm:block'>
                LIVE
              </span>
            </div>

            {canShareScreen ? (
              <TooltipProvider>
                <Tooltip delayDuration={200}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={async () => {
                        const inviteLink = `${window.location.origin}/room/${roomId}`;
                        const success = await copyToClipboard(inviteLink);
                        if (success) {
                          toast.success('Invitation Link Copied', {
                            description: 'Share this link to invite team members.',
                            icon: <Users className='w-4 h-4 text-blue-400' />,
                          });
                        }
                      }}
                      className='flex items-center gap-2 group cursor-pointer transition-all hover:scale-[1.01] active:opacity-80'
                    >
                      <h1 className='text-[16px] md:text-[18px] lg:text-[20px] font-black uppercase text-white tracking-tight truncate max-w-[120px] sm:max-w-[180px] md:max-w-[280px] lg:max-w-md'>
                        {((currentOrganization && (isMainOrgRoom || isBreakoutRoom)) || organizationName) ? (
                          <span className='flex items-center gap-2'>
                            <span className='text-white/40 font-medium'>
                              #{currentOrganization?.name || organizationName}
                            </span>
                            <span className='text-white'>/ {roomName || 'General'}</span>
                          </span>
                        ) : roomId ? (
                          roomId
                        ) : isSocialMode ? (
                          'SOCIAL V4'
                        ) : (
                          'UNKNOWN'
                        )}
                      </h1>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className='bg-black/95 border-white/10 text-xs text-center p-2 rounded-xl shadow-2xl'>
                    <p className='font-bold text-blue-400 mb-0.5'>Copy Invitation Link</p>
                    <p className='text-white/40'>Click to share access to this room</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <div className='flex items-center gap-2'>
                <h1 className='text-[16px] md:text-[18px] lg:text-[20px] font-black uppercase text-white tracking-tight truncate max-w-[120px] sm:max-w-[180px] md:max-w-[280px] lg:max-w-md'>
                  {((currentOrganization && (isMainOrgRoom || isBreakoutRoom)) || organizationName) ? (
                    <span className='flex items-center gap-2'>
                      <span className='text-white/40 font-medium'>
                        #{currentOrganization?.name || organizationName}
                      </span>
                      <span className='text-white'>/ {roomName || 'General'}</span>
                    </span>
                  ) : roomId ? (
                    roomId
                  ) : isSocialMode ? (
                    'SOCIAL V4'
                  ) : (
                    'UNKNOWN'
                  )}
                </h1>
              </div>
            )}
          </div>

          {/* Bottom Row: Status Indicator */}
          <div className='flex items-center gap-2 opacity-50 mt-0.5'>
            {isRoomLocked || accessType !== 'public' ? (
              <Lock size={10} className={modeTheme.accentClass} strokeWidth={2.5} />
            ) : (
              <Globe size={10} className={modeTheme.accentClass} strokeWidth={2.5} />
            )}
            <span
              className={`text-[9px] font-black tracking-[0.2em] uppercase transition-all whitespace-nowrap ${modeTheme.accentClass}`}
            >
              {isConnected ? `${displayMode.toUpperCase()} MODE • STABLE` : 'SECURING CHANNEL'}
            </span>
            {isSuperHost && (
              <span className='ml-1 text-[8px] font-black bg-yellow-500/20 text-yellow-500 px-1.5 py-0.5 rounded border border-yellow-500/30 uppercase tracking-[0.1em]'>
                Super Host
              </span>
            )}
          </div>
        </div>

        {/* 3. RIGHT ZONE: Actions */}
        <div className='flex items-center justify-end gap-2 md:gap-3 flex-1 basis-0'>
          {/* User Count / Participants - Compact Professional Pill */}
          {!isSocialMode && (
            <button
              onClick={() => setIsParticipantsOpen(true)}
              className='flex items-center gap-2.5 h-9 px-4 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 hover:border-blue-500/30 transition-all cursor-pointer group active:scale-95'
              title='Participants'
            >
              <Users
                size={15}
                className='text-blue-400 group-hover:scale-110 transition-transform'
              />
              <span className='text-xs font-black text-white/90 group-hover:text-white leading-none'>
                {users.length}
              </span>
            </button>
          )}

          {/* Room Overview View Button */}
          {currentOrganization && ((isHost && isMainOrgRoom) || currentUser?.isSuperHost) && (
            <div className='relative'>
              <button
                onClick={() => setShowViewMenu(!showViewMenu)}
                className={`hidden lg:flex h-9 px-3 rounded-xl items-center gap-1.5 border text-[10px] font-black uppercase tracking-widest transition-all group ${
                  showViewMenu
                    ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)]'
                    : viewMode === 'grid'
                      ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
                      : 'bg-white/5 border-white/5 text-white/40 hover:text-white hover:bg-white/10'
                }`}
              >
                {viewMode === 'grid' ? <LayoutGrid size={14} /> : <Eye size={14} />}
                <span>{viewMode === 'grid' ? 'Grid View' : 'Single Room'}</span>
              </button>

              {showViewMenu && (
                <>
                  {/* Invisible overlay for capturing outside clicks */}
                  <div 
                    className='fixed inset-0 z-[120] bg-transparent' 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowViewMenu(false);
                    }} 
                  />
                  
                  {/* Dropdown Container */}
                  <div className='absolute top-12 right-0 w-48 bg-[#0c0f14]/95 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl p-2 z-[130] flex flex-col gap-1 animate-in fade-in slide-in-from-top-2 duration-200'>
                    <button
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewMode('single');
                        setShowViewMenu(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        viewMode === 'single'
                          ? 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400'
                          : 'text-white/50 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <div className="w-4 h-4 flex items-center justify-center pointer-events-none">
                        {viewMode === 'single' ? (
                          <span className='w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]' />
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full border border-white/20" />
                        )}
                      </div>
                      <span className="pointer-events-none">Current Room</span>
                    </button>

                    <button
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewMode('grid');
                        setShowViewMenu(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        viewMode === 'grid'
                          ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.1)]'
                          : 'text-white/50 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <div className="w-4 h-4 flex items-center justify-center pointer-events-none">
                        <LayoutGrid
                          size={12}
                          className={viewMode === 'grid' ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]' : 'text-white/30'}
                        />
                      </div>
                      <span className="pointer-events-none">All Rooms (Grid)</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Ghost Toggle Button for Super Hosts */}
          {((isHost && isMainOrgRoom) || isSuperHost || currentUser?.isSuperHost || authUser?.user_metadata?.is_superhost) && (
             <TooltipProvider>
                <Tooltip delayDuration={200}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={handleToggleGhost}
                      className={`flex h-9 px-3 rounded-xl items-center gap-2 border text-[10px] font-black uppercase tracking-widest transition-all group ${
                        isGhostMode
                          ? 'bg-purple-500/20 border-purple-500/40 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                          : 'bg-white/5 border-white/5 text-white/40 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <Ghost size={14} className={isGhostMode ? 'animate-pulse' : ''} />
                      <span className="hidden xl:inline">{isGhostMode ? 'Ghost: ON' : 'Ghost: OFF'}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className='bg-black/95 border-white/10 text-xs text-center p-2 rounded-xl shadow-2xl z-[200]'>
                    <p className='font-bold text-purple-400 mb-0.5'>Ghost Mode</p>
                    <p className='text-white/40'>{isGhostMode ? 'Click to reveal yourself' : 'Click to observe silently'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
          )}

          {/* Manual Poll Button - Authorized Users Only */}
          {((isHost && isMainOrgRoom) || isSuperHost || currentUser?.isSuperHost || authUser?.user_metadata?.is_superhost) && (
             <TooltipProvider>
                <Tooltip delayDuration={200}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setShowManualPollModal(true)}
                      className="flex h-9 px-3 rounded-xl items-center gap-2 border bg-white/5 border-white/5 text-white/40 hover:text-indigo-400 hover:bg-white/10 hover:border-indigo-500/20 transition-all group"
                    >
                      <BarChart3 size={14} className="group-hover:scale-110 transition-transform" />
                      <span className="hidden xl:inline">Poll</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className='bg-black/95 border-white/10 text-xs text-center p-2 rounded-xl shadow-2xl z-[200]'>
                    <p className='font-bold text-indigo-400 mb-0.5'>Protocol Poll</p>
                    <p className='text-white/40'>Deploy a new consensus protocol</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
          )}

          <SettingsModal
            roomId={roomId!}
            isHost={canShareScreen}
            trigger={
              <button className='hidden md:flex h-9 w-9 rounded-full items-center justify-center hover:bg-white/10 transition-all group text-white/50 hover:text-white'>
                <Settings size={18} />
              </button>
            }
          />

        </div>
      </motion.header>

      {/* ── PARTICIPANT STRIP — Only visible in presentation/game/browser modes ── */}
      {!isSocialMode && hasJoined && isPresentationMode && (
        <ParticipantStrip
          localStream={isGhostMode ? null : localStream}
          localUserName={localUserName}
          isAudioEnabled={isGhostMode ? false : isAudioEnabled}
          isVideoEnabled={isGhostMode ? false : isVideoEnabled}
          localUserId={isGhostMode ? undefined : (authUser?.id || effectiveUserId || '')}
          localUserPhotoUrl={authUser?.user_metadata?.photo_url || null}
          localUserGender={authUser?.user_metadata?.gender || 'other'}
          users={users}
          remoteStreams={remoteStreams}
          revealNames={activeConfig.features.revealNames}
        />

      )}

      {/* ────────────────────────────────────────────────────
                ALL-ROOMS GRID VIEW (when viewMode = 'grid')
            ──────────────────────────────────────────────────── */}
      {viewMode === 'grid' && (isHost || isSuperHost) && (
        <RoomsGridView
          currentRoomId={roomId || ''}
          orgId={currentOrganization?.id || ''}
          onExit={() => setViewMode('single')}
        />
      )}

      {/* Main Stage Area — hidden in grid mode */}
      <main
        className={`flex-1 flex overflow-hidden relative transition-all duration-300 ${viewMode === 'grid' ? 'hidden' : ''}`}
      >
        {/* Ambient Motion Discipline - Slow gradient shift with game mode hue */}
        <motion.div
          animate={{
            background: isSocialMode
              ? [
                  'radial-gradient(circle at 20% 50%, rgba(236,72,153,0.05) 0%, transparent 70%)',
                  'radial-gradient(circle at 80% 50%, rgba(249,115,22,0.05) 0%, transparent 70%)',
                  'radial-gradient(circle at 20% 50%, rgba(236,72,153,0.05) 0%, transparent 70%)',
                ]
              : gameState?.isActive
                ? [
                    'radial-gradient(circle at 20% 50%, rgba(168,85,247,0.05) 0%, transparent 70%)',
                    'radial-gradient(circle at 80% 50%, rgba(168,85,247,0.05) 0%, transparent 70%)',
                    'radial-gradient(circle at 20% 50%, rgba(168,85,247,0.05) 0%, transparent 70%)',
                  ]
                : [
                    'radial-gradient(circle at 20% 50%, rgba(0,200,255,0.02) 0%, transparent 70%)',
                    'radial-gradient(circle at 80% 50%, rgba(0,200,255,0.02) 0%, transparent 70%)',
                    'radial-gradient(circle at 20% 50%, rgba(0,200,255,0.02) 0%, transparent 70%)',
                  ],
          }}
          transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
          className='absolute inset-0 pointer-events-none'
        />

        {/* AI Transcription Overlay */}
        <TranscriptionOverlay
          text={transcript}
          isFinal={isTranscriptFinal}
          mode={activeMode}
          enabled={activeConfig.features.transcription}
        />

        {/* Ultra Security Overlay */}
        {isUltraSecure && (
          <>
            <SecurityOverlay roomId={roomId || 'UNKNOWN'} userName={localUserName} />
            {/* CSS-based Copy/Screenshot Protection Layer (Deterrent) */}
            <style>{`
                            body {
                                user-select: none !important;
                                -webkit-user-select: none !important;
                            }
                            @media print {
                                body { display: none !important; }
                            }
                        `}</style>
            <div className="fixed inset-0 pointer-events-none z-[9999] mix-blend-overlay opacity-50 bg-[url('/noise.png')]"></div>
          </>
        )}

        {/* Searching Overlay - MOVED TO VIDEOGRID FOR IN-PLACE UI */}

        {/* Note: Dispatch Center is rendered below via <DispatchModal> — no duplicate embed here */}

        {/* Social Mode Camera Warning Overlay */}
        <AnimatePresence>
          {isSocialMode && cameraWarningState !== 'safe' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className='absolute inset-0 z-[150] bg-black/80 flex flex-col items-center justify-center p-8 text-center backdrop-blur-md'
            >
              <div className='w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mb-6 animate-pulse'>
                <VideoOff className='w-12 h-12 text-red-500' />
              </div>
              <h2 className='text-4xl font-black uppercase italic tracking-tighter text-red-500 mb-2'>
                CAMERA REQUIRED
              </h2>
              <p className='text-xl text-white/80 font-medium max-w-lg mb-8'>
                Social Mode requires video. <br />
                You will be disconnected in a few seconds.
              </p>
              <Button
                onClick={wrappedToggleVideo}
                className='bg-red-500 hover:bg-red-600 text-white font-bold py-4 px-8 rounded-xl text-lg shadow-[0_0_30px_rgba(239,68,68,0.3)] transition-all hover:scale-105'
              >
                Enable Camera Now
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* In-Room Status Micro-Banner */}
        <AnimatePresence>
          {showStatusBanner && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className={`absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest z-50 backdrop-blur-sm border shadow-xl flex items-center gap-2
                                ${
                                  roomStatus === 'live'
                                    ? 'bg-green-500/10 border-green-500/20 text-green-400 shadow-green-500/10'
                                    : roomStatus === 'upcoming'
                                      ? 'bg-orange-500/10 border-orange-500/20 text-orange-400 shadow-orange-500/10'
                                      : roomStatus === 'paused'
                                        ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400 shadow-yellow-500/10'
                                        : 'bg-red-500/10 border-red-500/20 text-red-500 shadow-red-500/10'
                                }`}
            >
              {roomStatus === 'live' && (
                <span className='relative flex h-2 w-2'>
                  <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75'></span>
                  <span className='relative inline-flex rounded-full h-2 w-2 bg-green-500'></span>
                </span>
              )}
              {roomStatus === 'live'
                ? UI_TEXT.STATUS_LIVE
                : roomStatus === 'upcoming'
                  ? UI_TEXT.STATUS_UPCOMING
                  : roomStatus === 'paused'
                    ? UI_TEXT.STATUS_PAUSED
                    : UI_TEXT.STATUS_ENDED}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Connection Readiness Cue */}
        <TooltipProvider>
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <div
                className={`absolute top-4 left-4 w-2 h-2 rounded-full z-20 shadow-lg ${
                  isConnected ? 'bg-green-500' : 'bg-yellow-500'
                }`}
              />
            </TooltipTrigger>
            <TooltipContent side='right' className='text-xs bg-black/90 border-white/10'>
              {isConnected ? 'Audio and video ready' : 'Connecting…'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Keyboard Shortcut Hint */}
        <AnimatePresence>
          {shortcutHint && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className='fixed bottom-24 left-1/2 -translate-x-1/2 bg-black/90 text-white px-4 py-2 rounded-lg text-xs z-50 backdrop-blur-sm border border-white/10'
            >
              {shortcutHint}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Removed duplicate SecurityOverlay */}

        <ParticipantsModal
          isOpen={isParticipantsOpen}
          onClose={() => setIsParticipantsOpen(false)}
        />
        <div
          className={`flex flex-col transition-all duration-500 ease-ultra ${
            isSocialMode ? 'w-1/2 h-full' : 'flex-1'
          }`}
        >
          {isPresentationMode ? (
            <div className='flex-1 flex flex-col min-h-0 transition-all duration-500'>
              {/* Wrapper: Transparent & Centered (No Background) */}
              <div
                className={`flex-1 relative flex items-center justify-center overflow-y-auto custom-scrollbar ${
                  isVirtualBrowserActive || isPresentingFile ? 'p-0 md:p-1' : 'p-2 md:p-4 lg:p-6'
                }`}
              >
                <AnimatePresence mode='wait'>
                  <motion.div
                    key={
                      isPresentingFile
                        ? 'file'
                        : isVirtualBrowserActive
                          ? 'browser'
                          : hasScreenShare
                            ? 'share'
                            : youtubeVideoId
                              ? 'yt'
                              : 'none'
                    }
                    initial={{ opacity: 0, scale: 0.98, filter: 'blur(10px)' }}
                    animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, scale: 1.02, filter: 'blur(10px)' }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className='w-full h-full relative z-10 flex items-center justify-center'
                  >
                    {/* Browser Container - Strict Box */}
                    {isPresentingFile && presentedFile && (
                      <div className='w-full h-full bg-[#05070a] border border-white/5 rounded-2xl md:rounded-[1.5rem] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.6)]'>
                        <FilePresenter file={presentedFile} onClose={closePresentedFile} />
                      </div>
                    )}

                    {/* Browser Container - Priority 2 */}
                    {isVirtualBrowserActive && !isPresentingFile && (
                      <div className='w-full h-full md:aspect-video bg-[#05070a] md:rounded-[1.5rem] overflow-hidden border border-white/5 md:shadow-[0_20px_60px_rgba(0,0,0,0.6)]'>
                        <VirtualBrowser />
                      </div>
                    )}

                    {/* Screen Share - Priority 3 */}
                    {hasScreenShare && !isPresentingFile && !isVirtualBrowserActive && (
                      <div className='w-full h-full md:aspect-video bg-black rounded-2xl md:rounded-[1.5rem] overflow-hidden border border-white/5 shadow-[0_20px_60px_rgba(0,0,0,0.6)] flex items-center justify-center relative'>
                        {localScreenStream && (
                          <video
                            autoPlay
                            muted
                            playsInline
                            webkit-playsinline="true"
                            ref={(v) => {
                              if (v && v.srcObject !== localScreenStream) {
                                v.srcObject = localScreenStream;
                              }
                            }}
                            className='max-w-full max-h-full object-contain'
                          />
                        )}
                        {Array.from(remoteScreenStreams.entries()).map(([uid, s]) => (
                          <video
                            key={`screen-${uid}`}
                            autoPlay
                            playsInline
                            muted
                            webkit-playsinline="true"
                            ref={(v) => {
                              if (v && v.srcObject !== s) {
                                v.srcObject = s;
                                // Force play to avoid some browsers staying paused on black
                                v.play().catch(err => {
                                  if (err.name !== 'AbortError') {
                                    console.warn('[Room] Remote screen share play failed:', err);
                                  }
                                });
                              }
                            }}
                            className='max-w-full max-h-full object-contain'
                          />
                        ))}
                        <div className='absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/80'>
                          Presentation Feed
                        </div>
                      </div>
                    )}

                    {/* YouTube Player - Priority 4 */}
                    {youtubeVideoId && !hasScreenShare && !isPresentingFile && !isVirtualBrowserActive && (
                      <div className='w-full h-full md:aspect-video bg-black border border-white/5 rounded-2xl md:rounded-[1.5rem] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.6)]'>
                        <Suspense
                          fallback={
                            <div className='flex items-center justify-center h-full text-[10px] font-black uppercase tracking-[0.5em] animate-pulse italic'>
                              Connecting Sync Node...
                            </div>
                          }
                        >
                          <SynchronizedYouTubePlayer
                            videoId={youtubeVideoId}
                            initialTime={youtubeCurrentTime}
                            isHost={isHost || !!currentUser?.isCoHost}
                          />
                        </Suspense>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          ) : (
            // Standard Video Grid Mode
            <div
              className={`flex-1 overflow-hidden relative flex flex-col ${isSocialMode ? 'p-4 md:p-6 lg:p-8' : 'p-2 md:p-6 lg:p-8'}`}
            >
              {/* Inner Container for Video Grid */}
              <div className='w-full h-full flex items-center justify-center relative'>
                <VideoGrid
                  localStream={isGhostMode ? null : localStream}
                  localUserName={localUserName}
                  isAudioEnabled={isGhostMode ? false : isAudioEnabled}
                  isVideoEnabled={isGhostMode ? false : isVideoEnabled}
                  isMediaLoading={isInitialLoading}
                  remoteStreams={remoteStreams}
                  users={users}
                  isSocialMode={isSocialMode}
                  isSearching={isSearching}
                  localUserId={isGhostMode ? undefined : (authUser?.id || effectiveUserId || '')}
                  localUserPhotoUrl={
                    authUser?.user_metadata?.photo_url || currentUser?.photoUrl || undefined
                  }
                  localUserGender={authUser?.user_metadata?.gender || currentUser?.gender}
                  layout={
                    activeMode === 'ultra' ? 'focus' : activeMode === 'fun' ? 'theater' : 'grid'
                  }
                  revealNames={activeConfig.features.revealNames}
                />

                {activeTimer && (
                  <div className='absolute top-4 right-4 z-[60]'>
                    <AITimer
                      duration={activeTimer.duration}
                      startedAt={activeTimer.startedAt}
                      label={activeTimer.label}
                      isPaused={activeTimer.isPaused}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Game arena: below video/content, same container style with turn indicator */}
          {gameState?.isActive && (
            <div className='shrink-0 px-2 md:px-4 pb-2 md:pb-4'>
              <GameArenaContainer />
            </div>
          )}
        </div>

        {/* Chat Panel - Overlay/Embedded handled internally */}
        <ChatPanel
          showChat={showChat}
          messages={messages}
          files={files}
          currentUser={currentUser}
          isHost={isHost}
          messagesEndRef={messagesEndRef}
          handleSendMessage={wrappedHandleSendMessage}
          newMessage={newMessage}
          setNewMessage={setNewMessage}
          fileInputRef={fileInputRef}
          handleFileUpload={handleFileUpload}
          triggerFileUpload={triggerFileUpload}
          isUploading={isUploading}
          presentFile={presentFile}
          onClose={() => setShowChat(false)}
          activePoll={activePoll}
          onVote={(index) =>
            socket?.emit('room:poll-vote', {
              roomId: roomId!,
              pollId: activePoll?.id,
              optionIndex: index,
            })
          }
          onNextMatch={isSocialMode ? handleSocialNext : undefined}
          isSocialMode={isSocialMode}
          variant={isSocialMode ? 'embedded' : 'overlay'}
        />
      </main>

      {/* Captions Overlay */}
      <CaptionsOverlay />

      <div className='shrink-0 safe-bottom'>
        {isSocialMode ? (
          <SocialRoomControls
            onReport={handleSocialReport}
            onDisconnect={() => {
              handleLeaveRoom();
              navigate('/connect');
            }}
          />
        ) : (
          <RoomControls
            roomId={roomId || ''}
            roomName={roomName}
            participantCount={users.length}
            isAudioEnabled={isAudioEnabled}
            toggleAudio={wrappedToggleAudio}
            isVideoEnabled={isVideoEnabled}
            toggleVideo={toggleVideo}
            isScreenSharing={isScreenSharing}
            handleToggleScreenShare={handleToggleScreenShare}
            canShareScreen={canShareScreen}
            youtubeVideoId={youtubeVideoId}
            setShowOTTModal={setShowOTTModal}
            isRecording={isRecording}
            startRecording={startRecording}
            stopRecording={stopRecording}
            isHost={isHost || isSuperHost}
            isCoHost={!!currentUser?.isCoHost}
            setShowDisbandConfirm={setShowDisbandConfirm}
            handleLeaveRoom={handleLeaveRoom}
            showChat={showChat}
            setShowChat={setShowChat}
            showStopShareConfirm={showStopShareConfirm}
            setShowStopShareConfirm={setShowStopShareConfirm}
            confirmStopShare={confirmStopShare}
            showDisbandConfirm={showDisbandConfirm}
            disbandRoom={disbandRoom}
            endSession={endSession}
            stopYoutubeVideo={stopYoutubeVideo}
            unreadCount={unreadCount}
            isVisible={isControlsVisible}
            setIsVisible={setIsControlsVisible}
            onStartBrowserWithUrl={handleStartVirtualBrowser}
            isGuest={!authUser}
            onFileSelected={handleFileUpload}
            waitingUserCount={waitingUsers.length}
            onGenerateSummary={() => wrappedGenerateSummary()}
            onInvite={() => setIsInviteOpen(true)}
            onStartYouTube={(videoId) => startYoutubeVideo(videoId)}
            isGameActive={!!gameState?.isActive}
            onOpenGameHub={() => setShowGameHub(true)}
            onOpenAbandonModal={() => setShowAbandonModal(true)}
            // Mode Props
            gamesEnabled={activeConfig.features.games}
            aiEnabled={activeConfig.features.aiSummary}
            securityLevel={activeConfig.securityLevel}
            // Feature Flags
            virtualBrowserEnabled={activeConfig.features.virtualBrowser}
            screenShareEnabled={activeConfig.features.screenShare}
            youtubeEnabled={activeConfig.features.virtualBrowser} // Link YouTube to virtual browser/media capability
            fileUploadEnabled={activeConfig.securityLevel !== 'high' || isHost || isSuperHost} // Host/Super can upload in any mode
            isMainRoom={isMainOrgRoom}
            isBreakout={isBreakoutRoom}
            recordingEnabled={activeConfig.features.screenRecording} // Explicit recording flag
            inviteEnabled={true}
            repairMedia={repairMedia}
          />
        )}
      </div>
      <Suspense fallback={null}>
        {showOTTModal && (
          <OTTGridModal
            isOpen={showOTTModal}
            onOpenChange={setShowOTTModal}
            onStartYouTube={(videoId) => startYoutubeVideo(videoId)}
            onFileUpload={async (file) => {
              await presentFileFromUpload(file);
              setShowOTTModal(false);
            }}
            onStartScreenShare={handleToggleScreenShare}
            onStartVirtualBrowser={() => {
              handleStartVirtualBrowser('https://duckduckgo.com');
            }}
          />
        )}
      </Suspense>



      <AuthPromptModal
        open={authPromptOpen}
        onOpenChange={setAuthPromptOpen}
        triggerActivity={authPromptTrigger}
      />

      {/* Join Room Screen Overlay */}
      <AnimatePresence>
        {!hasJoined && (!isWaiting || !isMainOrgRoom) && !joinExplicitlyRequested && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='fixed inset-0 z-[201] bg-[#050505] flex flex-col items-center justify-center p-4 overflow-hidden'
          >
            {/* Abstract Background elements */}
            <div className='absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-[120px] animate-pulse' />
            <div
              className='absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px] animate-pulse'
              style={{ animationDelay: '1s' }}
            />

            <div className='max-w-xl w-full relative z-10'>
              <motion.div
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className='text-center'
              >
                <div className='inline-flex items-center justify-center p-4 bg-primary/10 rounded-3xl mb-8 border border-primary/20 backdrop-blur-sm'>
                  <Globe className='w-12 h-12 text-primary animate-spin-slow' />
                </div>

                <h1 className='text-5xl md:text-6xl font-black mb-6 tracking-tight text-white'>
                  Ready to <span className='text-primary italic'>Connect?</span>
                </h1>

                <p className='text-xl text-white/50 mb-8 font-medium max-w-md mx-auto leading-relaxed'>
                  You've been invited to a{' '}
                  <span className='text-white font-bold'>secured transmission</span>.<br />
                  Step into the collaborative space.
                </p>

                <div className='flex flex-col text-left max-w-md mx-auto mb-12 overflow-hidden rounded-[2rem] bg-white/[0.02] border border-white/10 backdrop-blur-md shadow-2xl'>
                  <div className='flex items-center gap-4 p-5 border-b border-white/5 hover:bg-white/[0.04] transition-colors'>
                    <div className='w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center flex-shrink-0 border border-purple-500/20'>
                      <User className='w-6 h-6 text-purple-400' />
                    </div>
                    <div className='flex-1 min-w-0'>
                      <p className='text-[10.5px] uppercase font-black tracking-[0.2em] text-white/40 mb-1'>
                        Invited By
                      </p>
                      <p className='text-base font-bold text-white tracking-tight truncate'>
                        {preFetchedRoomInfo?.hostName || 'A Cospira Member'}
                      </p>
                    </div>
                  </div>

                  <div className='flex items-center gap-4 p-5 hover:bg-white/[0.04] transition-colors'>
                    <div className='w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center flex-shrink-0 border border-blue-500/20'>
                      <Building2 className='w-6 h-6 text-blue-400' />
                    </div>
                    <div className='flex-1 min-w-0'>
                      <p className='text-[10.5px] uppercase font-black tracking-[0.2em] text-white/40 mb-1'>
                        Organization
                      </p>
                      <p className='text-base font-bold text-white tracking-tight truncate'>
                        {preFetchedRoomInfo?.organizationName ||
                          preFetchedRoomInfo?.organization_name ||
                          preFetchedRoomInfo?.settings?.organizationName ||
                          currentOrganization?.name ||
                          organizationName ||
                          'Cospira Public'}
                      </p>
                    </div>
                  </div>
                </div>
                {!authUser && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className='max-w-md mx-auto mb-8 p-5 rounded-[1.5rem] bg-indigo-500/5 border border-indigo-500/10 flex flex-col items-center text-center overflow-hidden relative'
                  >
                    <div className='absolute top-0 right-0 p-4 opacity-10 pointer-events-none'>
                      <Sparkles className='w-16 h-16 text-indigo-400' />
                    </div>
                    <div className='flex items-center gap-2 text-indigo-300 font-black uppercase tracking-widest text-[10px] mb-3'>
                      <Bot className='w-4 h-4' /> AI Recommendation
                    </div>
                    <p className='text-sm font-medium leading-relaxed text-indigo-200/80 mb-6 px-4'>
                      Unverified session detected. Connect your identity to unlock encrypted chat,
                      shared resources, and persistent presence.
                    </p>
                    <div className='flex flex-col sm:flex-row items-center w-full gap-3 px-2'>
                      <Button
                        onClick={() => {
                          const returnUrl = encodeURIComponent(window.location.pathname);
                          navigate(`/auth?returnTo=${returnUrl}`);
                        }}
                        className='w-full h-12 rounded-xl text-sm font-bold bg-indigo-500 hover:bg-indigo-400 text-white shadow-[0_0_20px_-5px_rgba(99,102,241,0.5)] transition-all'
                      >
                        Verify Identity (Log In)
                      </Button>
                      <Button
                        variant='outline'
                        onClick={requestJoin}
                        disabled={isWaiting}
                        className='w-full h-12 rounded-xl text-sm font-bold border-indigo-500/20 text-indigo-300 hover:text-white hover:bg-white/5 transition-all disabled:opacity-50'
                      >
                        {isWaiting ? 'Waiting...' : 'Continue as Guest'}
                      </Button>
                    </div>
                  </motion.div>
                )}

                {authUser && (
                  <div className='flex flex-col sm:flex-row items-center justify-center gap-4'>
                    <Button
                      onClick={requestJoin}
                      disabled={isWaiting}
                      className='h-16 px-12 rounded-2xl text-lg font-bold bg-primary hover:bg-primary/90 text-black shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] transition-all hover:scale-105 active:scale-95 w-full sm:w-auto disabled:opacity-50'
                    >
                      {isWaiting ? 'Waiting for Approval...' : 'Join Session'}
                    </Button>

                    <Button
                      variant='outline'
                      onClick={() => {
                        handleLeaveRoom();
                        navigate('/dashboard');
                      }}
                      className='h-16 px-8 rounded-2xl text-lg font-bold border-white/10 text-white/60 hover:text-white hover:bg-white/5 w-full sm:w-auto'
                    >
                      Decline
                    </Button>
                  </div>
                )}

                <p className='mt-8 text-xs font-black uppercase tracking-widest text-white/20'>
                  Secure P2P Signaling • Encrypted Workspace
                </p>
              </motion.div>
            </div>

            {/* Decoration */}
            <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none opacity-20'>
              <div className='absolute top-1/4 left-1/4 w-1 h-1 bg-white rounded-full animate-ping' />
              <div
                className='absolute top-3/4 left-2/3 w-1 h-1 bg-white rounded-full animate-ping'
                style={{ animationDelay: '0.5s' }}
              />
              <div
                className='absolute top-1/2 left-1/4 w-1 h-1 bg-white rounded-full animate-ping'
                style={{ animationDelay: '1.2s' }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Waiting Room Overlay */}
      <AnimatePresence>
        {isWaiting && isMainOrgRoom && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='fixed inset-0 z-[200] bg-black/95 flex flex-col items-center justify-center p-4 text-center'
          >
            <div className='max-w-md w-full relative'>
              {/* Animated Background Glow */}
              <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[100px] animate-pulse pointer-events-none' />

              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className='relative z-10 bg-white/5 border border-white/10 p-8 md:p-12 rounded-[2rem] shadow-2xl backdrop-blur-xl'
              >
                <div className='w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse text-primary'>
                  <Shield className='w-10 h-10' />
                </div>
                <h2 className='text-3xl font-black mb-4 text-white tracking-tight'>
                  Security Check
                </h2>
                <p className='text-lg text-white/60 mb-8 font-medium leading-relaxed'>
                  The host has enabled a waiting room. Please wait while your access is verified.
                </p>
                <div className='flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest text-primary/80'>
                  <span className='w-2 h-2 bg-primary rounded-full animate-ping' />
                  Waiting for approval...
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Room Mode Suggestion - AI-powered */}
      <RoomModeSuggestion roomId={roomId || ''} isHost={isHost} />

      {/* Late Join Banner */}
      {lateJoinSummary && (
        <div className='fixed top-24 left-1/2 -translate-x-1/2 z-[100] w-full max-w-lg px-4'>
          <LateJoinBanner
            summary={lateJoinSummary.summary}
            bullets={lateJoinSummary.bullets}
            duration={lateJoinSummary.duration}
            onDismiss={() => undefined}
            onExpand={() => {
              // Optionally expand to a full view if needed
            }}
          />
        </div>
      )}

      {/* Invite Modal */}
      <InviteModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        roomId={roomId || ''}
      />

      {/* Soft Onboarding - First time only */}
      <SoftOnboarding />

      {/* Feedback on Exit */}
      <FeedbackModal
        isOpen={isFeedbackOpen}
        onClose={() => {
          setIsFeedbackOpen(false);
          navigate('/dashboard');
        }}
      />

      <GameHubModal open={showGameHub} onOpenChange={setShowGameHub} isPrivate={true} />
      <AbandonGameModal open={showAbandonModal} onOpenChange={setShowAbandonModal} />

      {activeConfig.features.aiSummary && (
        <SuperiorSummaryModal
          isOpen={showSuperiorSummary}
          onClose={() => setShowSuperiorSummary(false)}
          roomId={roomId || ''}
        />
      )}

      <RoomTimerModal
        isOpen={showTimerModal}
        onClose={() => setShowTimerModal(false)}
        onSetTimer={startRoomTimer}
      />

      <ManualPollModal
        isOpen={showManualPollModal}
        onClose={() => setShowManualPollModal(false)}
        isSuperHost={isSuperHost}
        pollHistory={pollHistory}
        onFetchHistory={fetchPollHistory}
        onSubmit={(data) => {
          socket?.emit('create-poll', {
            roomId: roomId!,
            ...data,
          }, (res: { success: boolean, error?: string }) => {
            if (!res.success) {
              toast.error('Deployment Failed', { description: res.error });
            }
          });
        }}
      />

      <DispatchModal
        isOpen={showDispatchModal}
        onClose={() => setShowDispatchModal(false)}
        orgId={currentOrganization?.id || roomId || ''}
      />

      <ParticipantsModal isOpen={isParticipantsOpen} onClose={() => setIsParticipantsOpen(false)} />

      {activePoll && !isPollDismissed && (
        <motion.div 
          drag
          dragMomentum={false}
          className='fixed bottom-32 right-8 z-[80] w-full max-w-sm px-4 pointer-events-auto cursor-move'
        >
          <AIPoll
            {...activePoll}
            voters={activePoll.voters}
            isHostOrSuperHost={isHost || isSuperHost}
            onVote={(index: number) => {
              socket?.emit('cast-poll-vote', { pollId: activePoll.id, optionIndex: index });
            }}
            onEndPoll={() => {
              socket?.emit('end-poll', { pollId: activePoll.id });
            }}
            onDismiss={() => setIsPollDismissed(true)}
          />
        </motion.div>
      )}

      {/* Ultra Secure Fullscreen Enforcement Blocker */}
      <UltraSecureBlocker 
        isVisible={isSecurityBlocked} 
        chances={securityChances} 
        onRequestFullscreen={requestFullscreen} 
      />

      {/* Warning Toast for Key Masking */}
      <KeyWarningOverlay isVisible={isKeyWarningVisible} pressedKey={pressedKey} availableChances={keyChances} />

      {/* Global Secure Mask (100% Black) */}
      <AnimatePresence>
        {isMaskActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[12000] bg-black"
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Room;
