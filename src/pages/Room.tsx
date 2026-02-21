import { lazy, Suspense, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Shield, VideoOff, Users, Info, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useWebSocket } from '@/hooks/useWebSocket';
import { DraggableParticipantStrip } from '@/components/room/DraggableParticipantStrip';
import { useAuth } from '@/hooks/useAuth';
import { useRecording } from '@/hooks/useRecording';
import { useRoom } from '@/hooks/useRoom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import UserAvatar from '@/components/UserAvatar';
import RoomControls from '@/components/room/RoomControls';
import VideoGrid from '@/components/room/VideoGrid';
import ChatPanel from '@/components/room/ChatPanel';
import FeedbackModal from '@/components/FeedbackModal';
const SynchronizedYouTubePlayer = lazy(() => import('@/components/SynchronizedYouTubePlayer'));
const OTTGridModal = lazy(() => import('@/components/OTTGridModal'));
import { GameHubModal, AbandonGameModal } from '@/components/games/GameSelector';
import { GameArenaContainer } from '@/components/games/GameArenaContainer';
import { VirtualBrowser } from '@/components/VirtualBrowser';
import { FilePresenter } from '@/components/room/FilePresenter';
import { SoftOnboarding } from '@/components/room/SoftOnboarding';
import { CaptionsOverlay } from '@/components/room/CaptionsOverlay';
import { RoomModeSuggestion } from '@/components/room/RoomModeSuggestion';
import { SecurityOverlay } from '@/components/room/SecurityOverlay';
import { getModeConfig, type RoomMode } from '@/services/RoomIntelligence';
import AITimer from '@/components/room/AITimer';
import LateJoinBanner from '@/components/room/LateJoinBanner';
import InviteModal from '@/components/room/InviteModal';
import OrpionSummaryModal from '@/components/room/OrpionSummaryModal';
import { AuthPromptModal } from '@/components/room/AuthPromptModal';
import { useNetworkQuality, NetworkQuality } from '@/hooks/useNetworkQuality';
import { RoomSkeleton } from '@/components/room/RoomSkeleton';
import { UI_TEXT } from '@/utils/terminology';
import { User as WsUser } from '@/types/websocket';
import SocialRoomControls from '@/components/room/SocialRoomControls';
import RoomInfoModal from '@/components/room/RoomInfoModal';
import ParticipantsModal from '@/components/room/ParticipantsModal';
import { SecurityDecryptionModal } from '@/components/room/SecurityDecryptionModal';
import { TranscriptionOverlay } from '@/components/room/TranscriptionOverlay';
import { MeetingSummaryModal } from '@/components/room/MeetingSummaryModal';
// import STTService from '@/services/ai/STTService'; // Handled by Context
import { logger } from '../utils/logger';
import AISummaryService, { MeetingSummary } from '@/services/ai/AISummaryService';
import { useNavigate, useLocation } from 'react-router-dom';
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
    } = useRoom();

    const {
        socket,
        messages,
        users,
        files,
        isHost,
        isConnected,
        roomName,
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
        activePoll,
        lateJoinSummary,
        roomMode,
        roomModeConfig,
        roomStatus,
        endSession,
        leaveRoom,
        enableMedia,
    } = useWebSocket();

    const activeMode = (roomMode || 'mixed') as RoomMode;
    const activeConfig = getModeConfig(activeMode);

    const { user: authUser } = useAuth();
    const { isRecording, startRecording, stopRecording } = useRecording();

    const [unreadCount, setUnreadCount] = useState(0);
    const [isControlsVisible, setIsControlsVisible] = useState(true);
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const prevMessagesLengthRef = useRef(messages.length);
    const [isInitialLoading, setIsInitialLoading] = useState(true); 
    const mediaLoadTimeout = useRef<NodeJS.Timeout>();
    
    // Elite-tier UI state
    const [showStatusBanner, setShowStatusBanner] = useState(true);
    const [shortcutHint, setShortcutHint] = useState<string | null>(null);
    const [shortcutUsed, setShortcutUsed] = useState<Set<string>>(new Set());
    const [showSummaryModal, setShowSummaryModal] = useState(false);
    const [isInfoOpen, setIsInfoOpen] = useState(false);
    const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
    const [showGameHub, setShowGameHub] = useState(false);
    const [showAbandonModal, setShowAbandonModal] = useState(false);
    
    // Safety Definition
    // const showSkeleton = isInitialLoading || !isConnected;

    // Derived State from Mode Config
    // Derived State from Mode Config
    const showGames = activeConfig.features.games;
    const showAISummary = activeConfig.features.summary;
    const isUltraSecure = activeConfig.securityLevel === 'high';

    // DEBUG: Verify Mode Propagation
    useEffect(() => {
        if (isConnected) {
            toast.info(`Room Config Active: ${activeMode.toUpperCase()}`, {
                description: `Features: Games=${showGames}, AI=${showAISummary}, Security=${activeConfig.securityLevel}`,
                duration: 5000,
            });
        }
    }, [isConnected, activeMode, showGames, showAISummary, activeConfig]);

    // Ultra Security Decryption State
    // Ultra Security Decryption State
    const [isDecrypted, setIsDecrypted] = useState(!isUltraSecure);

    // AI Intelligence State
    const [transcript, setTranscript] = useState('');
    const [isTranscriptFinal, setIsTranscriptFinal] = useState(false);
    const [generatedSummary, setGeneratedSummary] = useState<MeetingSummary | null>(null);
    const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

    // Sync local transcript with WebSocket context
    const { lastTranscript } = useWebSocket();
    useEffect(() => {
        if (lastTranscript) {
            setTranscript(lastTranscript.text);
            setIsTranscriptFinal(lastTranscript.isFinal);
        }
    }, [lastTranscript]);

    /* Removed duplicate STTService.init/start logic - handled by WebSocketContext */

    const handleGenerateSummary = useCallback(async () => {
        if (!activeConfig.features.summary) return;
        setIsGeneratingSummary(true);
        setShowSummaryModal(true);
        
        try {
            // Mock duration calculation
            const duration = 3600; // 1 hour dummy
            // Pass transcript context
            const context = transcript || "Session logs unavailable.";
            const summary = await AISummaryService.generateSummary(roomId || 'demo', activeMode, duration, context);
            setGeneratedSummary(summary);
        } catch (_error) {
            toast.error("Failed to generate mission report.");
        } finally {
            setIsGeneratingSummary(false);
        }
    }, [activeConfig.features.summary, roomId, activeMode, transcript]);
    
    useEffect(() => {
        // If switching TO ultra mode dynamically, re-lock? 
        // For now, if we are in ultra and not decrypted, it stays locked.
        // If we switch modes, maybe we don't force re-lock to avoid annoyance, or maybe we do.
        // Let's rely on initial load or mode switch logic.
        if (isUltraSecure && !isDecrypted) {
             // Keep locked
        } else if (!isUltraSecure && !isDecrypted) {
            setIsDecrypted(true);
        }
    }, [isUltraSecure, isDecrypted]);

    const modeTheme = useMemo(() => {
        switch (activeMode) {
            case 'fun':
                return {
                    bg: 'bg-[#0F0B14]',
                    accentColor: '#D946EF', // Cospira Purple
                    accentClass: 'text-fuchsia-500',
                    borderClass: 'border-fuchsia-500/20',
                    selection: 'selection:bg-fuchsia-500',
                    shadow: 'shadow-fuchsia-500/20'
                };
            case 'professional':
                return {
                    bg: 'bg-[#0B0F14]',
                    accentColor: '#3B82F6', // Blue
                    accentClass: 'text-blue-500',
                    borderClass: 'border-blue-500/20',
                    selection: 'selection:bg-blue-500',
                    shadow: 'shadow-blue-500/20'
                };
            case 'ultra':
                return {
                    bg: 'bg-[#050000]',
                    accentColor: '#EF4444', // Red
                    accentClass: 'text-red-500',
                    borderClass: 'border-red-500/30',
                    selection: 'selection:bg-red-500',
                    shadow: 'shadow-red-500/30'
                };
            case 'mixed':
            default:
                return {
                    bg: 'bg-[#0B0F14]',
                    accentColor: '#10B981', // Emerald
                    accentClass: 'text-emerald-500',
                    borderClass: 'border-white/5',
                    selection: 'selection:bg-emerald-500',
                    shadow: 'shadow-emerald-500/20'
                };
        }
    }, [activeMode]);

    // Guest Auth Prompt Logic
    const [authPromptOpen, setAuthPromptOpen] = useState(false);
    const [authPromptTrigger, setAuthPromptTrigger] = useState<'microphone' | 'camera' | 'chat' | 'summary' | 'timer'>('timer');
    const [, setGuestInteractionCount] = useState({ mic: 0, camera: 0, chat: 0 });
    const hasShownLateJoinPrompt = useRef(false); // Ref to track if prompt has been shown

    // --- Social Mode Logic (Phase 3) ---
    const isSocialRoom = roomId?.startsWith('cnt-');
    const isSocialMode = !!isSocialRoom || (activeMode as string) === 'social';
    
    // Safety Force
    // const cameraWarningState = 'safe'; 
    // const isMediaLoading = false;
    
    // Override activeMode display for UI consistency in social rooms
    const displayMode = isSocialMode ? 'social' : activeMode;
    
    const navigate = useNavigate();
    const location = useLocation();
    const socialState = location.state as { socialIntent: string; socialLanguage: string } | null;



    // --- Social Mode Camera Enforcement ---
    const [cameraWarningState, setCameraWarningState] = useState<'safe' | 'warning' | 'critical'>('safe');
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
                toast.error("Removed: Camera rule violation.");
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
            toast.error(data.reason || "Connection terminated.");
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
                         connectionType: queueConnectionType
                     } 
                 });
                 setIsSearching(false);
             }
        };
        socket.on('match_found', onMatchFound);
        return () => { socket.off('match_found', onMatchFound); };
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
                     connectionType: queueConnectionType
                 });
             }
        }, 300);
    }, [socket, socialState, queueInterests, queueConnectionType, leaveRoom]);

    const handleSocialReport = () => {
        if (socket) {
             socket.emit('report_user', { roomId, reason: 'User Report' });
             toast.error("User Reported", { description: "Our safety team has been notified. Interaction logs secured." });
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
            setGuestInteractionCount(prev => {
                const newCount = prev.mic + 1;
                if (newCount === 3) {
                    setAuthPromptTrigger('microphone');
                    setAuthPromptOpen(true);
                }
                return { ...prev, mic: newCount };
            });
        }
    }, [toggleAudio, authUser]);

    const wrappedHandleSendMessage = useCallback((e: React.FormEvent) => {
        handleSendMessage(e);
        if (!authUser) {
             setGuestInteractionCount(prev => {
                const newCount = prev.chat + 1;
                if (newCount === 5) { // Prompt after 5 messages
                    setAuthPromptTrigger('chat');
                    setAuthPromptOpen(true);
                }
                return { ...prev, chat: newCount };
            });
        }
    }, [handleSendMessage, authUser]);

    const wrappedToggleVideo = useCallback(() => {
        toggleVideo();
        if (!authUser) {
            setGuestInteractionCount(prev => {
                const newCount = prev.camera + 1;
                if (newCount === 3) {
                    setAuthPromptTrigger('camera');
                    setAuthPromptOpen(true);
                }
                return { ...prev, camera: newCount };
            });
        }
    }, [toggleVideo, authUser]);

    const wrappedGenerateSummary = useCallback((_options?: { broadcast?: boolean }) => {
        if (!authUser) {
            setAuthPromptTrigger('summary');
            setAuthPromptOpen(true);
            return;
        }
        handleGenerateSummary();
    }, [authUser, handleGenerateSummary]);

    // Auto-open summary when generated
    useEffect(() => {
        if (meetingSummary) {
            setShowSummaryModal(true);
        }
    }, [meetingSummary]);

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
                 toast.info("Joined Late?", {
                    description: "Generate a private summary to catch up on what you missed.",
                    action: (
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => wrappedGenerateSummary({ broadcast: false })}
                            className="bg-purple-500/20 border-purple-500/50 hover:bg-purple-500/30 text-purple-200"
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
            
            switch(key) {
                case 'm':
                    wrappedToggleAudio();
                    if (!shortcutUsed.has('m')) {
                        setShortcutHint('Press M to mute');
                        setShortcutUsed(prev => new Set(prev).add('m'));
                        setTimeout(() => setShortcutHint(null), 2000);
                    }
                    break;
                case 'v':
                    toggleVideo();
                    if (!shortcutUsed.has('v')) {
                        setShortcutHint('Press V to toggle camera');
                        setShortcutUsed(prev => new Set(prev).add('v'));
                        setTimeout(() => setShortcutHint(null), 2000);
                    }
                    break;
                case 's':
                    handleToggleScreenShare();
                    if (!shortcutUsed.has('s')) {
                        setShortcutHint('Press S to share screen');
                        setShortcutUsed(prev => new Set(prev).add('s'));
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
                    description: 'We\'ve optimized audio to keep you connected.',
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

    if (isWaiting) {
        return (
            <div className='min-h-screen bg-[#0B0F14] flex items-center justify-center p-6'>
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-md w-full"
                >
                    <Card className='luxury-card bg-[#11161D] border-white/5 p-10 rounded-[3rem] overflow-hidden relative'>
                        <div className="absolute top-0 right-0 p-10 opacity-5">
                            <Shield className="w-48 h-48 -rotate-12 translate-x-20 -translate-y-20" />
                        </div>
                        <CardHeader className="p-0 mb-10 text-center">
                            <div className="w-20 h-20 bg-amber-500/10 border border-amber-500/20 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
                                <Shield className="w-10 h-10 text-amber-500" />
                            </div>
                            <CardTitle className='text-4xl font-black uppercase italic tracking-tighter mb-4'>Security Barrier</CardTitle>
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
                                className="w-full h-16 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] text-white hover:bg-white/10 transition-all"
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
    const isPresentationMode = hasScreenShare || isPresentingFile || !!youtubeVideoId || gameState?.isActive || isVirtualBrowserActive;
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

            {/* Ultra-Luxury Navbar - 10/10 Plan (LOCKED) */}
            <motion.header 
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className={`h-[56px] md:h-[64px] border-b ${modeTheme.borderClass} luxury-glass px-4 md:px-6 flex items-center justify-between shrink-0 z-[100] safe-top relative ${modeTheme.bg}/95 transition-all duration-700`}
            >
                {/* 1. LEFT ZONE: Brand (Humbled) */}
                <div className="flex items-center w-[80px] md:w-[200px] shrink-0 opacity-75 hover:opacity-100 transition-opacity duration-300">
                     <img 
                        src="/cospira_logo_nav.png" 
                        alt="Cospira Logo" 
                        className="w-9 h-9 object-contain grayscale-[0.3] hover:grayscale-0 transition-all drop-shadow-[0_0_15px_rgba(168,85,247,0.15)]"
                     />
                </div>

                {/* 2. CENTER ZONE: HERO STATUS (Absolute Center) */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center pointer-events-none md:pointer-events-auto min-w-[140px]">
                    
                    {/* Top Row: LIVE + Room Code */}
                    <div className="flex items-center gap-2 mb-0.5">
                        <motion.div 
                            animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }} 
                            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                            className="flex items-center justify-center w-2 h-2 rounded-full bg-[#EF4444] shadow-[0_0_10px_rgba(239,68,68,0.6)]"
                        />
                        <span className="text-[10px] font-bold text-[#EF4444] uppercase tracking-[0.08em] leading-none shadow-red-500/20 drop-shadow-sm hidden md:block">LIVE</span>
                        
                        <TooltipProvider>
                            <Tooltip delayDuration={200}>
                                <TooltipTrigger asChild>
                                    <button 
                                        onClick={() => {
                                            navigator.clipboard.writeText(roomId || '');
                                            toast.success('Room Code Copied', { 
                                                description: 'Share it to invite others.', 
                                                icon: <Users className="w-4 h-4" /> 
                                            });
                                        }}
                                        className="flex items-center gap-2 group cursor-pointer pointer-events-auto transition-all hover:scale-[1.02]"
                                    >
                                         <span className="text-[18px] md:text-[20px] font-semibold text-white tracking-tight group-hover:text-white/90 transition-colors cursor-pointer decoration-white/0 underline-offset-4 group-hover:decoration-white/20 hover:underline">
                                            {isSocialMode ? 'SOCIAL V4' : (roomId ? roomId : 'UNKNOWN')}
                                         </span>
                                        {/* Copy Icon Micro-interaction */}
                                        <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 scale-75 hidden md:block -ml-1">
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/40"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                                        </div>
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent className="bg-black/90 border-white/10 text-xs font-medium">
                                    <p>Click to copy Room ID</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>

                    {/* Bottom Row: Status Indicator (Trust Signal) */}
                    <div className="flex items-center gap-3">
                         <div className="flex items-center gap-1.5 opacity-90">
                             <Lock size={10} className={modeTheme.accentClass} strokeWidth={2.5} />
                             
                             <div className="flex items-center">
                                 <span className={`text-[10px] md:text-[11px] ${modeTheme.accentClass} font-medium tracking-[0.02em] uppercase`}>
                                     {isConnected ? (
                                        <>
                                            <span className="font-bold border-r border-white/10 pr-2 mr-2">{displayMode.toUpperCase()} MODE</span>
                                            {isUltraSecure ? 'Secure • Encrypted' : 'Connection Stable'}
                                        </>
                                     ) : 'Securing Channel'}
                                 </span>
                                 {!isConnected && (
                                    <motion.span 
                                        animate={{ opacity: [0, 1, 0] }}
                                        transition={{ duration: 1.5, repeat: Infinity }}
                                        className={`ml-0.5 ${modeTheme.accentClass}`}
                                    >...</motion.span>
                                 )}
                             </div>
                         </div>
                         
                         {/* Signal Status */}
                         <div className={`hidden md:flex items-end gap-[1.5px] h-2.5 ml-2 ${modeTheme.accentClass}`} title={`Signal: ${netQuality.toUpperCase()}`}>
                            <div className={`w-[2px] rounded-full ${netQuality !== 'offline' ? 'bg-current' : 'bg-white/10'} h-[20%]`} />
                            <div className={`w-[2px] rounded-full ${['good', 'fair'].includes(netQuality) ? 'bg-current' : 'bg-white/10'} h-[40%]`} />
                            <div className={`w-[2px] rounded-full ${netQuality === 'good' ? 'bg-current' : 'bg-white/10'} h-[60%]`} />
                            <div className={`w-[2px] rounded-full ${netQuality === 'good' ? 'bg-current' : 'bg-white/10'} h-[80%]`} />
                         </div>
                         
                         {/* Mobile Only: User Count in Center Bottom */}
                         {!isSocialMode && (
                             <div className="flex md:hidden items-center gap-1.5 border-l border-white/10 pl-3 ml-1">
                                <Users size={10} className="text-blue-400" />
                                <span className="text-[10px] font-bold text-white/80">{users.length}</span>
                             </div>
                         )}
                    </div>
                </div>

                {/* 3. RIGHT ZONE: Actions (Premium Behavior) */}
                <div className='flex items-center justify-end w-[80px] md:w-[200px] shrink-0 gap-3 md:gap-4'>
                    {/* User Count (Desktop Only) */}
                    {!isSocialMode && (
                        <button 
                            onClick={() => setIsParticipantsOpen(true)}
                            className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/5 hover:bg-white/10 hover:border-white/10 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)] transition-all cursor-pointer group active:scale-95 duration-200"
                        >
                            <Users className="w-4 h-4 text-blue-400/80 group-hover:text-blue-400 transition-colors" />
                            <span className="text-xs font-bold text-white/80 group-hover:text-white">{users.length}</span>
                        </button>
                    )}

                    {/* Actions Group */}
                    <div className="flex items-center gap-3">
                        <button
                            className={`hidden md:flex h-9 w-9 rounded-full items-center justify-center hover:bg-white/10 hover:shadow-[0_0_10px_rgba(255,255,255,0.1)] transition-all active:scale-95 duration-200 group ${isInfoOpen ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white'}`}
                            onClick={() => setIsInfoOpen(!isInfoOpen)}
                        >
                            <Info size={18} className="group-hover:scale-110 transition-transform" />
                        </button>

                        {/* Avatar */}
                        <div className={`h-8 w-8 md:h-9 md:w-9 rounded-full bg-[#0B0F14] p-0.5 overflow-hidden relative group cursor-pointer transition-transform hover:scale-105 active:scale-95 duration-200 ${isConnected ? 'ring-1 ring-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : 'border border-white/10'}`}>
                             <UserAvatar 
                                name={localUserName} 
                                avatarUrl={currentUser?.photoUrl || authUser?.user_metadata?.photo_url || undefined}
                                gender={currentUser?.gender || authUser?.user_metadata?.gender || 'other'}
                                seed={currentUser?.id || authUser?.id || effectiveUserId || undefined}
                                className='h-full w-full rounded-full border-none'
                            />
                        </div>
                    </div>
                </div>

            </motion.header>

            {/* Main Stage Area */}
            <main className='flex-1 flex overflow-hidden relative'>
                {/* Ambient Motion Discipline - Slow gradient shift with game mode hue */}
                <motion.div
                    animate={{
                        background: isSocialMode ? [
                            'radial-gradient(circle at 20% 50%, rgba(236,72,153,0.05) 0%, transparent 70%)',
                            'radial-gradient(circle at 80% 50%, rgba(249,115,22,0.05) 0%, transparent 70%)',
                            'radial-gradient(circle at 20% 50%, rgba(236,72,153,0.05) 0%, transparent 70%)',
                        ] : (gameState?.isActive ? [
                            'radial-gradient(circle at 20% 50%, rgba(168,85,247,0.05) 0%, transparent 70%)',
                            'radial-gradient(circle at 80% 50%, rgba(168,85,247,0.05) 0%, transparent 70%)',
                            'radial-gradient(circle at 20% 50%, rgba(168,85,247,0.05) 0%, transparent 70%)',
                        ] : [
                            'radial-gradient(circle at 20% 50%, rgba(0,200,255,0.02) 0%, transparent 70%)',
                            'radial-gradient(circle at 80% 50%, rgba(0,200,255,0.02) 0%, transparent 70%)',
                            'radial-gradient(circle at 20% 50%, rgba(0,200,255,0.02) 0%, transparent 70%)',
                        ])
                    }}
                    transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
                    className="absolute inset-0 pointer-events-none"
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
                        <SecurityOverlay 
                            roomId={roomId || 'UNKNOWN'} 
                            userName={localUserName} 
                        />
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
                
                {/* Social Mode Camera Warning Overlay */}
                <AnimatePresence>
                    {isSocialMode && cameraWarningState !== 'safe' && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-[150] bg-black/80 flex flex-col items-center justify-center p-8 text-center backdrop-blur-md"
                        >
                            <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
                                <VideoOff className="w-12 h-12 text-red-500" />
                            </div>
                            <h2 className="text-4xl font-black uppercase italic tracking-tighter text-red-500 mb-2">
                                CAMERA REQUIRED
                            </h2>
                            <p className="text-xl text-white/80 font-medium max-w-lg mb-8">
                                Social Mode requires video. <br/>
                                You will be disconnected in a few seconds.
                            </p>
                            <Button 
                                onClick={wrappedToggleVideo} 
                                className="bg-red-500 hover:bg-red-600 text-white font-bold py-4 px-8 rounded-xl text-lg shadow-[0_0_30px_rgba(239,68,68,0.3)] transition-all hover:scale-105"
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
                                ${roomStatus === 'live' ? 'bg-green-500/10 border-green-500/20 text-green-400 shadow-green-500/10' : 
                                  roomStatus === 'upcoming' ? 'bg-orange-500/10 border-orange-500/20 text-orange-400 shadow-orange-500/10' :
                                  roomStatus === 'paused' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400 shadow-yellow-500/10' :
                                  'bg-red-500/10 border-red-500/20 text-red-500 shadow-red-500/10'
                                }`}
                        >
                            {roomStatus === 'live' && (
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                            )}
                            {roomStatus === 'live' ? UI_TEXT.STATUS_LIVE : 
                             roomStatus === 'upcoming' ? UI_TEXT.STATUS_UPCOMING :
                             roomStatus === 'paused' ? UI_TEXT.STATUS_PAUSED : UI_TEXT.STATUS_ENDED}
                        </motion.div>
                    )}
                </AnimatePresence>
                
                {/* Connection Readiness Cue */}
                <TooltipProvider>
                    <Tooltip delayDuration={300}>
                        <TooltipTrigger asChild>
                            <div className={`absolute top-4 left-4 w-2 h-2 rounded-full z-20 shadow-lg ${
                                isConnected ? 'bg-green-500' : 'bg-yellow-500'
                            }`} />
                        </TooltipTrigger>
                        <TooltipContent side="right" className="text-xs bg-black/90 border-white/10">
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
                            className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-black/90 text-white px-4 py-2 rounded-lg text-xs z-50 backdrop-blur-sm border border-white/10"
                        >
                            {shortcutHint}
                        </motion.div>
                    )}
                </AnimatePresence>

                <OrpionSummaryModal 
                    isOpen={showSummaryModal}
                    onClose={() => setShowSummaryModal(false)}
                    roomId={roomId || ''}
                />
                
                {/* Removed duplicate SecurityOverlay */}
                
                <RoomInfoModal 
                    isOpen={isInfoOpen} 
                    onClose={() => setIsInfoOpen(false)} 
                    roomId={roomId || ''} 
                    isHost={isHost} 
                    roomName={roomName || undefined}
                />
                
                <ParticipantsModal 
                    isOpen={isParticipantsOpen}
                    onClose={() => setIsParticipantsOpen(false)}
                />
                <div className={`flex flex-col transition-all duration-500 ease-ultra ${
                    isSocialMode 
                        ? 'w-1/2 h-full' 
                        : 'flex-1'
                }`}>
                    {(isPresentationMode && !isSocialMode) ? (
                        <div className="flex-1 flex flex-col min-h-0 transition-all duration-500">
                            {/* Wrapper: Transparent & Centered (No Background) */}
                            <div className={`flex-1 relative flex items-center justify-center overflow-y-auto custom-scrollbar ${isVirtualBrowserActive ? 'p-0 md:p-4' : 'p-2 md:p-4 lg:p-6'}`}>
                                
                                <AnimatePresence mode="wait">
                                    <motion.div 
                                        key={youtubeVideoId ? 'yt' : isPresentingFile ? 'file' : isVirtualBrowserActive ? 'browser' : 'share'}
                                        initial={{ opacity: 0, scale: 0.98, filter: 'blur(10px)' }}
                                        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                                        exit={{ opacity: 0, scale: 1.02, filter: 'blur(10px)' }}
                                        transition={{ duration: 0.5, ease: 'easeOut' }}
                                        className="w-full h-full max-w-[1400px] relative z-10 flex items-center justify-center"
                                    >
                                        {/* Browser Container - Strict Box */}
                                        {isVirtualBrowserActive && (
                                            <div className="w-full h-full md:aspect-video bg-[#05070a] md:rounded-[1.5rem] overflow-hidden border border-white/5 md:shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
                                                <VirtualBrowser />
                                            </div>
                                        )}
                                        
                                        {/* Screen Share - Strict Box */}
                                        {hasScreenShare && (
                                            <div className='w-full h-full md:aspect-video bg-black rounded-2xl md:rounded-[1.5rem] overflow-hidden border border-white/5 shadow-[0_20px_60px_rgba(0,0,0,0.6)] flex items-center justify-center relative'>
                                                {localScreenStream && (
                                                    <video autoPlay muted playsInline ref={(v) => { if (v) v.srcObject = localScreenStream; }} className='max-w-full max-h-full object-contain' />
                                                )}
                                                {Array.from(remoteScreenStreams.entries()).map(([uid, s]) => (
                                                    <video key={`screen-${uid}`} autoPlay playsInline ref={(v) => { if (v) v.srcObject = s; }} className='max-w-full max-h-full object-contain' />
                                                ))}
                                                 <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/80">
                                                    Presentation Feed
                                                </div>
                                            </div>
                                        )}

                                        {isPresentingFile && presentedFile && !hasScreenShare && (
                                            <div className="w-full h-full md:aspect-video bg-[#05070a] border border-white/5 rounded-2xl md:rounded-[1.5rem] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
                                                 <FilePresenter 
                                                    file={presentedFile} 
                                                    onClose={closePresentedFile} 
                                                 />
                                            </div>
                                        )}

                                        {youtubeVideoId && !hasScreenShare && !isPresentingFile && (
                                            <div className="w-full h-full md:aspect-video bg-black border border-white/5 rounded-2xl md:rounded-[1.5rem] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
                                                <Suspense fallback={<div className="flex items-center justify-center h-full text-[10px] font-black uppercase tracking-[0.5em] animate-pulse italic">Connecting Sync Node...</div>}>
                                                     <SynchronizedYouTubePlayer videoId={youtubeVideoId} initialTime={youtubeCurrentTime} isHost={isHost || !!currentUser?.isCoHost} />
                                                </Suspense>
                                            </div>
                                        )}
                                    </motion.div>
                                </AnimatePresence>
                            </div>

                            <DraggableParticipantStrip 
                                localStream={localStream}
                                localUserName={localUserName}
                                isAudioEnabled={isAudioEnabled}
                                authUser={currentUser || (authUser ? { 
                                    id: authUser.id, 
                                    name: authUser.user_metadata?.display_name || 'User', 
                                    photoUrl: authUser.user_metadata?.photo_url,
                                    gender: authUser.user_metadata?.gender
                                } as WsUser : null)}
                                socket={socket && socket.id ? { id: socket.id } : null}
                                users={users}
                                remoteStreams={remoteStreams}
                                localUserPhotoUrl={authUser?.user_metadata?.photo_url || null}
                                localUserGender={authUser?.user_metadata?.gender || 'other'}
                            />
                        </div>
                    ) : (
                        // Standard Video Grid Mode
                        <div className={`flex-1 overflow-hidden relative flex flex-col ${isSocialMode ? 'p-4 md:p-6 lg:p-8' : 'p-2 md:p-6 lg:p-8'}`}>
                            {/* Inner Container for Video Grid */}
                            <div className="w-full h-full flex items-center justify-center relative">
                                <VideoGrid
                                    localStream={localStream}
                                    localUserName={localUserName}
                                    isAudioEnabled={isAudioEnabled}
                                    isVideoEnabled={isVideoEnabled}
                                    isMediaLoading={isInitialLoading}
                                    remoteStreams={remoteStreams}
                                    users={users}
                                    isSocialMode={isSocialMode}
                                    isSearching={isSearching}
                                    localUserId={authUser?.id || effectiveUserId || ''}
                                    localUserPhotoUrl={authUser?.user_metadata?.photo_url || currentUser?.photoUrl || undefined}
                                    localUserGender={authUser?.user_metadata?.gender || currentUser?.gender}
                                    layout={(activeMode === 'ultra' ? 'focus' : (activeMode === 'fun' ? 'theater' : 'grid'))}
                                />
                                {activeTimer && (
                                    <div className="absolute top-4 right-4 z-[60]">
                                        <AITimer 
                                            duration={activeTimer.duration} 
                                            startedAt={activeTimer.startedAt} 
                                            label={activeTimer.label} 
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Game arena: below video/content, same container style with turn indicator */}
                    {gameState?.isActive && (
                        <div className="shrink-0 px-2 md:px-4 pb-2 md:pb-4">
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
                    onVote={(index) => socket?.emit('room:poll-vote', { roomId: roomId!, pollId: activePoll?.id, optionIndex: index })}
                    onNextMatch={isSocialMode ? handleSocialNext : undefined}
                    isSocialMode={isSocialMode}
                    variant={isSocialMode ? 'embedded' : 'overlay'}
                />

            </main>

            {/* Captions Overlay */}
            <CaptionsOverlay />

            <div className="shrink-0 safe-bottom">
                {isSocialMode ? (
                    <SocialRoomControls
                        onReport={handleSocialReport}
                        onDisconnect={() => { handleLeaveRoom(); navigate('/connect'); }}
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
                    isHost={isHost}
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
                    onStartBrowserWithUrl={startVirtualBrowser}
                    isGuest={!authUser}
                    onFileSelected={(file) => presentFileFromUpload(file)}
                    waitingUserCount={waitingUsers.length}
                    onGenerateSummary={() => wrappedGenerateSummary()}
                    onInvite={() => setIsInviteOpen(true)}
                    onStartYouTube={(videoId) => startYoutubeVideo(videoId)}
                    isGameActive={!!gameState?.isActive}
                    onOpenGameHub={() => setShowGameHub(true)}
                    onOpenAbandonModal={() => setShowAbandonModal(true)}
                    // Mode Props
                    gamesEnabled={activeConfig.features.games}
                    aiEnabled={activeConfig.features.summary}
                    securityLevel={activeConfig.securityLevel}
                    // Feature Flags
                    virtualBrowserEnabled={activeConfig.features.virtualBrowser}
                    screenShareEnabled={activeConfig.features.screenShare}
                    youtubeEnabled={activeConfig.features.virtualBrowser} // Link YouTube to virtual browser/media capability
                    fileUploadEnabled={activeConfig.securityLevel !== 'high'} // No file transfers in Ultra
                    recordingEnabled={activeConfig.securityLevel !== 'high'} // No recording in Ultra
                    inviteEnabled={true}
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
                            startVirtualBrowser('https://10.45.124.230:8080/e');
                        }}
                    />
                )}
            </Suspense>

            <AuthPromptModal 
                open={authPromptOpen} 
                onOpenChange={setAuthPromptOpen} 
                triggerActivity={authPromptTrigger} 
            />
            
            {/* Waiting Room Overlay */}
            <AnimatePresence>
                {isWaiting && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] bg-black/95 flex flex-col items-center justify-center p-4 text-center"
                    >
                        <div className="max-w-md w-full relative">
                            {/* Animated Background Glow */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[100px] animate-pulse pointer-events-none" />
                            
                            <motion.div 
                                initial={{ scale: 0.9, y: 20 }}
                                animate={{ scale: 1, y: 0 }}
                                className="relative z-10 bg-white/5 border border-white/10 p-8 md:p-12 rounded-[2rem] shadow-2xl backdrop-blur-xl"
                            >
                                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse text-primary">
                                    <Shield className="w-10 h-10" />
                                </div>
                                <h2 className="text-3xl font-black mb-4 text-white tracking-tight">Security Check</h2>
                                <p className="text-lg text-white/60 mb-8 font-medium leading-relaxed">
                                    The host has enabled a waiting room. Please wait while your access is verified.
                                </p>
                                <div className="flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest text-primary/80">
                                    <span className="w-2 h-2 bg-primary rounded-full animate-ping" />
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
                <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] w-full max-w-lg px-4">
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

            {/* AI Summary Modal */}
            <MeetingSummaryModal 
                open={showSummaryModal} 
                onClose={() => setShowSummaryModal(false)}
                summary={generatedSummary}
                loading={isGeneratingSummary}
            />
        </div>
    );
};

export default Room;


