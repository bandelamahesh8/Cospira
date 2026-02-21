import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePresence } from '@/hooks/usePresence';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { SignalingService } from '@/services/SignalingService';
import { SFUManager } from '@/services/SFUManager';
import { RoomSocketService } from '@/domains/rooms';
import { ActivityTracker } from '@/services/ActivityTracker';
import { logger } from '@/utils/logger';
import { User, FileData, Message, RoomInfo } from '@/types/websocket';
import { WebSocketContext, WebSocketState, WebSocketContextType } from './WebSocketContextValue';
import { useMediaStream } from './WebSocket/useMediaStream';
import { useSocketEvents } from './WebSocket/useSocketEvents';
import STTService from '@/services/ai/STTService';
import { RoomMode, RoomModeConfig, RoomSuggestion } from '@/services/RoomIntelligence';
import { SecurityService } from '@/services/SecurityService';

export { type WebSocketState, type WebSocketContextType };
// ICE servers will be fetched from backend
export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, session, signOut } = useAuth();

  // Initialize guest identity from localStorage if available
  const [guestIdentity, setGuestIdentity] = useState<{ id: string; name: string } | null>(() => {
    try {
      const stored = localStorage.getItem('cospira_guest_identity');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const navigate = useNavigate();
  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    roomId: null,
    roomName: null,
    recentRooms: [],
    users: [],
    messages: [],
    files: [],
    error: null,
    isHost: false,
    localStream: null,
    localScreenStream: null,
    remoteStreams: new Map(),
    remoteScreenStreams: new Map(),
    isAudioEnabled: false,
    isVideoEnabled: false,
    isScreenSharing: false,
    presentedFile: null,
    isPresentingFile: false,
    presenterName: null,
    isRoomLocked: false,
    youtubeVideoId: null,
    isYoutubePlaying: false,
    youtubeStatus: 'closed',
    youtubeCurrentTime: 0,
    selectedVideoDeviceId: localStorage.getItem('preferredVideoDeviceId'),
    selectedAudioDeviceId: localStorage.getItem('preferredAudioDeviceId'),
    isMediaLoading: false,
    hasWaitingRoom: false,
    waitingUsers: [],
    isWaiting: false,
    accessType: 'public',
    inviteToken: null,
    gameState: {
      isActive: false,
      type: null,
      players: [],
      turn: null,
      board: null,
      winner: null,
      startGame: () => {},
    },
    virtualBrowserUrl: null,
    isVirtualBrowserActive: false,
    lastTranscript: null,
    isNoiseSuppressionEnabled: false,
    isAutoFramingEnabled: false,
    isAway: false,
    meetingSummary: null,
    roomMode: null,
    roomModeConfig: null,
    activeTimer: null,
    activePoll: null,
    lateJoinSummary: null,
    roomModeSuggestion: null,
    roomStatus: 'live',
    isAiActive: false,
  });

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Services
  const signalingRef = useRef<SignalingService | null>(null);
  const sfuManagerRef = useRef<SFUManager | null>(null);
  const activityTrackerRef = useRef<ActivityTracker | null>(null);
  
  // Presence Detection (60s timeout) - must be declared before use
  const isAway = usePresence(60000);
  
  // Presence: Listen for Updates
  useEffect(() => {
    const onUserStatusChange = ({ userId, status }: { userId: string; status: string }) => {
        logger.info(`[WebSocketContext] User ${userId} status changed to ${status}`);
        setState(prev => ({
            ...prev,
            users: prev.users.map(u => 
                u.id === userId ? { ...u, isAway: status === 'away' } : u
            )
        }));
    };

    // We need to attach this listener after signaling ref is initialized.
    // However, signalingRef.current might be null initially.
    // Best place is inside the main connection effect or a separate effect that depends on signalingRef.current
    // But since signalingRef is a ref, changes don't trigger re-renders.
    // The main connection effect (line 162) handles initialization.
    // Let's rely on useSocketEvents or just check if it's connected in an interval?
    // Better: useSocketEvents manages listeners. But for now, let's put it here but ensure signalingRef exists.
    
    const sig = signalingRef.current;
    if (sig) {
      sig.on('user:status-change', onUserStatusChange);
      const onMediaState = ({ userId, audio, video }: { userId: string; audio?: boolean; video?: boolean }) => {
        setState(prev => ({
          ...prev,
          users: prev.users.map(u =>
            u.id === userId
              ? {
                  ...u,
                  isMuted: audio !== undefined ? !audio : u.isMuted,
                  isVideoOn: video !== undefined ? video : u.isVideoOn,
                }
              : u
          ),
        }));
      };
      sig.on('user:media-state', onMediaState);
      return () => {
        sig.off('user:status-change', onUserStatusChange);
        sig.off('user:media-state', onMediaState);
      };
    }
    return () => {};
  }, [state.isConnected]); // Re-bind on connection status change (which implies signaling might have reconnected)
  const roomServiceRef = useRef<RoomSocketService | null>(null);

  const setupSfuManager = useCallback(() => {
    if (!signalingRef.current) return null;

    const sfuManager = new SFUManager(signalingRef.current, (userId, track, kind, appData) => {
        if (!track || !userId) {
          logger.warn('[WebSocketContext] onTrack skipped: missing track or userId');
          return;
        }
        const isScreenShare = appData?.source === 'screen';

        if (import.meta.env.DEV) {
          logger.info('[WebSocketContext] onTrack called:', { 
            userId, 
            kind, 
            trackId: track.id, 
            source: appData?.source,
            isScreenShare
          });
        }
        
        // Ensure track is enabled
        track.enabled = true;
        
        setState(prev => {
          // targetMap is based on whether it's screen share or webcam
          const targetMapKey = isScreenShare ? 'remoteScreenStreams' : 'remoteStreams';
          const newStreamsMap = new Map(prev[targetMapKey]);
          const uid = String(userId);
          
          // Get existing tracks from current stream if it exists
          const oldStream = newStreamsMap.get(uid);
          const oldTracks = oldStream ? oldStream.getTracks() : [];
          
          // Remove any existing track of the same kind to avoid duplicates
          const filteredTracks = oldTracks.filter(t => t.kind !== track.kind);
          
          // Create a NEW MediaStream object with combined tracks to trigger React re-renders in VideoTile
          const newStream = new MediaStream([...filteredTracks, track]);
          
          // Update the map with the new stream object
          newStreamsMap.set(uid, newStream);

          // When receiving a remote audio track (e.g. mobile mic), ensure this user is not shown as muted
          // so the web plays audio even if user:media-state was reordered or lost.
          let nextUsers = prev.users;
          if (kind === 'audio' && !isScreenShare) {
            const hasUser = nextUsers.some(u => String(u.id) === uid);
            if (hasUser) {
              nextUsers = nextUsers.map(u => String(u.id) === uid ? { ...u, isMuted: false } : u);
            } else {
              nextUsers = [...nextUsers, { id: uid, name: 'Guest', isMuted: false, isVideoOn: false }];
            }
          }

          return { ...prev, [targetMapKey]: newStreamsMap, users: nextUsers };
        });

        // Handle track ended event
        track.onended = () => {
          logger.info(`[WebSocketContext] Track ${track.id} ended for user ${userId}`);
          setState(prev => {
            const targetMapKey = isScreenShare ? 'remoteScreenStreams' : 'remoteStreams';
            const newStreams = new Map(prev[targetMapKey]);
            const stream = newStreams.get(String(userId));
            
            if (stream) {
              stream.getTracks().forEach(t => {
                if (t.id === track.id) {
                  stream.removeTrack(t);
                }
              });
              if (stream.getTracks().length === 0) {
                newStreams.delete(String(userId));
                logger.info(`[WebSocketContext] Removed empty stream for user ${userId} (${targetMapKey})`);
              }
            }
            return { ...prev, [targetMapKey]: newStreams };
          });
        };
      });

    const currentId = user?.id || guestIdentity?.id;
    if (currentId) {
        sfuManager.setUserId(currentId);
    }

    sfuManagerRef.current = sfuManager;
    return sfuManager;
  }, [user?.id, guestIdentity?.id]);

  // Initialize services
  useEffect(() => {
    // Get WebSocket URL from environment or default
    // Dynamic WebSocket URL determination
    let wsUrl = import.meta.env.VITE_WS_URL;
    const { hostname, origin, protocol } = window.location;
    
    // Logic: If on localhost, use hardcoded dev port 3001
    // If on a Tunnel or LAN IP, use the current origin (proxied via Vite)
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
       wsUrl = `${protocol}//${hostname}:3001`;
    } else {
       // Capture current origin (handles Tunnels, LAN IPs, and custom domains)
       wsUrl = origin;
       logger.info('[WebSocketContext] Adaptive Mode: Using origin for WebSocket:', wsUrl);
    }
    
    wsUrl = wsUrl || 'https://localhost:3001';
    
    // Auto-upgrade to secure protocol if page is secure to prevent Mixed Content errors
    if (window.location.protocol === 'https:' && wsUrl.startsWith('http:')) {
        wsUrl = wsUrl.replace('http:', 'https:');
        logger.info('Auto-upgraded WebSocket URL to HTTPS due to secure page context');
    }

    logger.info('Initializing WebSocket connection to:', wsUrl);
    
    signalingRef.current = new SignalingService(wsUrl);
    roomServiceRef.current = new RoomSocketService(signalingRef.current);

    // Initialize ActivityTracker with user info
    if (user?.id && signalingRef.current) {
      activityTrackerRef.current = new ActivityTracker(signalingRef.current);
      activityTrackerRef.current.initialize(user.id);
    }

    setupSfuManager();

    // Connect signaling with error handling
    try {
      signalingRef.current.connect(session?.access_token);
      
      // Auto-fetch rooms on connection to populate state
      signalingRef.current.emit('get-recent-rooms', {}, (rooms: RoomInfo[]) => {
          if (Array.isArray(rooms)) {
              setState(prev => ({ ...prev, recentRooms: rooms }));
          }
      });
    } catch (error) {
      logger.error('Failed to initialize signaling connection:', error);
      setState(prev => ({ 
        ...prev, 
        isConnected: false, 
        error: `Failed to connect to server: ${error instanceof Error ? error.message : String(error)}` 
      }));
    }

    return () => {
      signalingRef.current?.disconnect();
      sfuManagerRef.current?.closeAll();
    };
  }, [setupSfuManager, session?.access_token, user?.id]); 

  // Persist Room ID on join (moved outside to fix Rules of Hooks)
  useEffect(() => {
      if (state.roomId) {
          localStorage.setItem('cospira_last_room_id', state.roomId);
          localStorage.setItem('cospira_last_room_time', Date.now().toString());
      } else {
          localStorage.removeItem('cospira_last_room_id');
          localStorage.removeItem('cospira_last_room_time');
      }
  }, [state.roomId]);
 

  // Use split hooks
  const {
    enableMedia,
    disableMedia,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    toggleNoiseSuppression,
    toggleAutoFraming,
  } = useMediaStream({
    sfuManagerRef,
    setLocalStream: (stream) => setState(prev => ({ ...prev, localStream: stream })),
    setLocalScreenStream: (stream) => setState(prev => ({ ...prev, localScreenStream: stream })),
    setIsAudioEnabled: (enabled) => setState(prev => ({ ...prev, isAudioEnabled: enabled })),
    setIsVideoEnabled: (enabled) => setState(prev => ({ ...prev, isVideoEnabled: enabled })),
    setIsScreenSharing: (sharing) => setState(prev => ({ ...prev, isScreenSharing: sharing })),
    setIsMediaLoading: (loading) => setState(prev => ({ ...prev, isMediaLoading: loading })),
    setIsNoiseSuppressionEnabled: (enabled) => setState(prev => ({ ...prev, isNoiseSuppressionEnabled: enabled })),
    setIsAutoFramingEnabled: (enabled) => setState(prev => ({ ...prev, isAutoFramingEnabled: enabled })),
    selectedVideoDeviceId: state.selectedVideoDeviceId,
    selectedAudioDeviceId: state.selectedAudioDeviceId,
    signalingRef,
    stateRef,
  });




  // --- Presence Effect ---
  useEffect(() => {
    // Determine if status changed compared to previous
    // Actually, we should just emit whenever isAway changes.
    // We also need to update local user object in state if we are in the list.
    
    if (!state.roomId || !state.isConnected) return;

    const status = isAway ? 'away' : 'online';
    logger.info('[Presence] Status changed:', status);
    
    signalingRef.current?.emit('user:status-change', { roomId: state.roomId, status });

    // Update local state immediately for responsiveness
    const currentUserId = user?.id || guestIdentity?.id;
    setState(prev => ({
        ...prev,
        isAway,
        users: prev.users.map(u => u.id === currentUserId ? { ...u, status } : u)
    }));

  }, [isAway, state.roomId, state.isConnected, user?.id, guestIdentity?.id]);


  // --- STT Management ---
  useEffect(() => {
      // Logic: If Audio + Connected -> Start STT
      // If Audio Disabled -> Stop STT
      const manageSTT = async () => {
          if (state.isAudioEnabled && state.localStream && state.isConnected && state.roomId) {
              // Only start if not already active (STTService handles idempotency but let's be safe)
              // Fetch token
              // Use env key directly for client-side demo
              try {
                  const key = import.meta.env.VITE_DEEPGRAM_API_KEY;
                  if (key) {
                      await STTService.init(key);
                      logger.info('[WebSocketContext] Starting STT...');
                      
                      await STTService.start(state.localStream, (text, isFinal) => {
                          // Emit transcript event
                          if (isFinal) {
                              signalingRef.current?.emit('transcript', {
                                  roomId: stateRef.current.roomId, 
                                  text,
                                  timestamp: new Date().toISOString()
                              });
                              
                              setState(prev => ({ 
                                  ...prev, 
                                  lastTranscript: { 
                                      id: crypto.randomUUID(),
                                      text, 
                                      userId: user?.id || guestIdentity?.id || 'me', 
                                      userName: user?.user_metadata?.display_name || 'You',
                                      timestamp: new Date(),
                                      isFinal: true 
                                  } 
                              }));
                          }
                      });
                  } else {
                     // Fallback to fetch if needed or log error
                     // const res = await fetch(...)
                     logger.warn('[WebSocketContext] No STT Key found');
                  }
              } catch (e) {
                  logger.error('Failed to setup STT', e);
              }
          } else {
              STTService.stop();
          }
      };
      
      manageSTT();
      
      return () => {
          // Cleanup handled by dependency change logic, but explicitly on unmount:
          // STTService.stop(); // Don't stop on every render, only if conditions change
      };
  }, [state.isAudioEnabled, state.localStream, state.isConnected, state.roomId]);

  useSocketEvents({
    signalingRef,
    sfuManagerRef,
    state,
    setState,
    signOut,
    navigate,
    currentUserId: user?.id || guestIdentity?.id || null,
  });

  // Methods
  const joinRoom = useCallback(
    (
      roomId: string,
      password?: string,
      inviteToken?: string,
      onSuccess?: () => void,
      onError?: (error: string) => void
    ) => {
      // Guest handling: If no user, use persisted guest identity
      let currentGuest = guestIdentity;
      if (!user && !currentGuest) {
         const newId = crypto.randomUUID();
         currentGuest = {
            id: newId,
            name: `Guest ${newId.substring(0, 4).toUpperCase()}`
         };
         setGuestIdentity(currentGuest);
         localStorage.setItem('cospira_guest_identity', JSON.stringify(currentGuest));
      }

      const userData = {
        id: user?.id || currentGuest!.id,
        name: user?.user_metadata?.display_name || user?.email?.split('@')[0] || currentGuest!.name,
        photoUrl: user?.user_metadata?.photo_url || null,
        gender: user?.user_metadata?.gender || 'other',
        isGuest: !user
      };

      logger.info('[WebSocketContext] Joining room with user data:', { 
        roomId, 
        userData,
        fullUser: user ? { id: user.id, email: user.email, metadata: user.user_metadata } : 'Guest'
      });

      if (roomServiceRef.current) {
        roomServiceRef.current.joinRoom({ roomId, password, inviteToken, user: userData })
          .then((response) => {
            if (response.error === 'waiting') {
              setState((prev) => ({ ...prev, isWaiting: true, error: null }));
              if (onSuccess) onSuccess();
              return;
            }

            if (!response.success) {
              if (onError) {
                onError(response.error || 'Unknown error');
              } else {
                setState((prev) => ({ ...prev, error: response.error || 'Unknown error' }));
                toast({ title: 'Join Failed', description: response.error, variant: 'destructive' });
              }
            } else if (response.room) {
              logger.info('[WebSocketContext] Join room callback received, waiting for room-joined event');
              // Track room joined activity
              if (activityTrackerRef.current) {
                activityTrackerRef.current.trackRoomJoined(roomId);
              }
              if (onSuccess) onSuccess();
            }
          })
          .catch((error) => {
             logger.error('Error joining room:', error);
             if (onError) onError('Failed to join room');
             else setState((prev) => ({ ...prev, error: 'Failed to join room' }));
          });
      }
    },
    [user, guestIdentity]
  );

  // Store joinRoom in a ref to avoid dependency issues
  const joinRoomRef = useRef(joinRoom);
  useEffect(() => {
    joinRoomRef.current = joinRoom;
  }, [joinRoom]);


  const rejoinRoom = useCallback(() => {
    if (state.roomId) {
      logger.info('Reconnecting to room after WebSocket reconnection');
      joinRoomRef.current(state.roomId);
    }
  }, [state.roomId]);



  // Track previous connection state to handle reconnections only
  const prevIsConnected = useRef(state.isConnected);

  // Phase 5: Global Chat
  useEffect(() => {
      if (!signalingRef.current) return;
      
      const onChatMessage = (data: { sender: string, content: string, timestamp: string }) => {
          setState(prev => ({
              ...prev,
              chatMessages: [...(prev.chatMessages || []), {
                  id: crypto.randomUUID(),
                  userId: 'unknown', // Server should send this
                  userName: data.sender,
                  content: data.content,
                  timestamp: new Date(data.timestamp),
                  type: 'global'
              }]
          }));
      };

      signalingRef.current.on('global-chat-message', onChatMessage);
      
      return () => {
          signalingRef.current?.off('global-chat-message', onChatMessage);
      };
  }, []);


  useEffect(() => {
    // Only rejoin if we just reconnected (false -> true) and have a room ID
    if (!prevIsConnected.current && state.isConnected) {
        if (state.roomId) {
             rejoinRoom();
        } else {
             // Check local storage for session recovery
             const persistedRoomId = localStorage.getItem('cospira_last_room_id');
             const persistedRoomTime = localStorage.getItem('cospira_last_room_time');
             if (persistedRoomId && persistedRoomTime) {
                 const ONE_HOUR = 60 * 60 * 1000;
                 if (Date.now() - parseInt(persistedRoomTime) < ONE_HOUR) {
                     logger.info('[WebSocketContext] Recovering session:', persistedRoomId);
                     joinRoomRef.current(persistedRoomId, undefined, undefined, () => {
                         toast({ title: 'Session Restored', description: 'Welcome back!' });
                     });
                 }
             }
        }
    }
    prevIsConnected.current = state.isConnected;
  }, [state.isConnected, state.roomId, rejoinRoom]);

  const createRoom = useCallback(
    (
      roomId: string,
      roomName: string,
      password?: string,
      accessType: 'public' | 'password' | 'invite' | 'organization' = 'public',
      onSuccess?: () => void,
      orgId?: string,
      settings?: Record<string, unknown>
    ) => {
      if (!state.isConnected) {
          toast({ title: 'Connection Error', description: 'Cannot create room: Disconnected from server', variant: 'destructive' });
          return;
      }
      
      let currentGuest = guestIdentity;
      if (!user && !currentGuest) {
          const newId = crypto.randomUUID();
          currentGuest = {
              id: newId,
              name: `Guest ${newId.substring(0, 4).toUpperCase()}`
          };
          setGuestIdentity(currentGuest);
          localStorage.setItem('cospira_guest_identity', JSON.stringify(currentGuest));
      }

      const userData = {
        id: user?.id || currentGuest!.id,
        name: user?.user_metadata?.display_name || user?.email?.split('@')[0] || currentGuest!.name,
        isGuest: !user
      };

      if (roomServiceRef.current) {
        roomServiceRef.current.createRoom({
            roomId,
            roomName,
            password,
            accessType,
            user: userData,
            orgId,
            settings: { ...settings, mode: (settings?.mode as string) || 'fun' }, // Ensure mode is in settings
            roomMode: (settings?.mode as string) || 'fun' // Top level fallback
        }).then(() => {
            joinRoom(roomId, password, undefined, onSuccess);
        });
      }
    },
    [user, joinRoom, guestIdentity, state.isConnected]
  );

  const sendMessage = useCallback((content: string) => {
    if (!state.roomId) return;
    
    // Check for commands
    if (content.startsWith('/')) {
        signalingRef.current?.emit('assistant:command', { 
            roomId: state.roomId, 
            text: content 
        }, (res: { success: boolean; error?: string }) => {
            if (!res.success) {
                toast({ title: 'AI Error', description: res.error || 'Failed to process command', variant: 'destructive' });
            }
        });
        return;
    }

    if (user || guestIdentity) {
      // Security Check: Rate Limit
      if (!SecurityService.canPerformAction('chat')) {
          toast({ title: 'Slow Down', description: 'You are sending messages too fast.', variant: 'destructive' });
          return;
      }

      // Security Check: Sanitize
      const sanitizedContent = SecurityService.sanitizeInput(content);
      if (!sanitizedContent) return;

      // Optimistic Update: Add message locally before sending
      const tempId = crypto.randomUUID();
      const optimisticMessage: Message = {
          id: tempId,
          userId: user?.id || guestIdentity?.id || 'me',
          userName: user?.user_metadata?.display_name || user?.email?.split('@')[0] || guestIdentity?.name || 'You',
          content: sanitizedContent,
          timestamp: new Date(),
          pending: true
      };

      setState(prev => ({
          ...prev,
          messages: [...(prev.messages || []), optimisticMessage]
      }));

      const messageData = {
        roomId: state.roomId,
        message: {
          id: tempId,
          content: sanitizedContent,
        },
      };
      
      signalingRef.current?.emit('send-message', messageData, (response?: { success: boolean }) => {
        if (response?.success) {
          // Track message sent activity
          if (activityTrackerRef.current && state.roomId) {
            activityTrackerRef.current.trackMessageSent(state.roomId);
          }
          // Note: Deduplication happens in useSocketEvents' onNewMessage
        } else {
          toast({ title: 'Error', description: 'Failed to send message', variant: 'destructive' });
          // Remove the failed message
          setState(prev => ({
              ...prev,
              messages: prev.messages.filter(m => m.id !== tempId)
          }));
        }
      });
    }
  }, [state.roomId, user, guestIdentity]);

  const uploadFile = useCallback(async (file: File): Promise<boolean> => {
    if (!state.roomId || !user) return false;

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          const fileData = {
            id: crypto.randomUUID(),
            userId: user.id,
            userName: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Guest',
            name: file.name,
            size: file.size,
            type: file.type,
            content: e.target.result, // Base64 content
            timestamp: new Date(),
          };

          signalingRef.current?.emit('upload-file', { roomId: state.roomId!, file: fileData }, (response?: { success: boolean; error?: string }) => {
            if (response?.success) {
              // Track file sharing activity
              if (activityTrackerRef.current && state.roomId) {
                activityTrackerRef.current.trackFileShared(state.roomId, file.name);
              }
              resolve(true);
            } else {
              toast({ title: 'Upload Failed', description: response?.error || 'Unknown error', variant: 'destructive' });
              resolve(false);
            }
          });
        }
      };
      reader.readAsDataURL(file);
    });
  }, [state.roomId, user]);

  const sendFile = uploadFile;

  const leaveRoom = useCallback((options?: { keepMedia?: boolean }) => {
    if (state.roomId) {
      if (!options?.keepMedia) {
        disableMedia();
      }
      roomServiceRef.current?.leaveRoom(state.roomId);
      sfuManagerRef.current?.closeAll();
      setState((prev) => ({
        ...prev,
        roomId: null,
        roomName: null,
        users: [],
        messages: [],
        files: [],
        isHost: false,
        localStream: options?.keepMedia ? prev.localStream : null,
        localScreenStream: options?.keepMedia ? prev.localScreenStream : null,
        remoteStreams: new Map(),
        remoteScreenStreams: new Map(),
        isAudioEnabled: false,
        isVideoEnabled: false,
      }));
    }
  }, [state.roomId, disableMedia]);

  const disbandRoom = useCallback(() => {
    if (state.roomId && state.isHost) {
      roomServiceRef.current?.disbandRoom(state.roomId);
    }
  }, [state.roomId, state.isHost]);

  const endSession = useCallback(() => {
    if (state.roomId && state.isHost) {
        signalingRef.current?.emit('end-session', { roomId: state.roomId });
    }
  }, [state.roomId, state.isHost]);

  const kickUser = useCallback((userId: string) => {
    if (state.roomId && state.isHost) {
      roomServiceRef.current?.kickUser(state.roomId, userId);
    }
  }, [state.roomId, state.isHost]);

  const updateRoomSettings = useCallback((roomName?: string, password?: string, hasWaitingRoom?: boolean, accessType?: 'public' | 'password' | 'invite' | 'organization') => {
    if (state.roomId && state.isHost) {
      const settings = { roomName, password, hasWaitingRoom, accessType };
      roomServiceRef.current?.updateSettings(state.roomId, settings);
    }
  }, [state.roomId, state.isHost]);

  const admitUser = useCallback((userId: string) => {
    if (state.roomId && state.isHost) {
      roomServiceRef.current?.admitUser(state.roomId, userId);
    }
  }, [state.roomId, state.isHost]);

  const denyUser = useCallback((userId: string) => {
    if (state.roomId && state.isHost) {
      roomServiceRef.current?.denyUser(state.roomId, userId);
    }
  }, [state.roomId, state.isHost]);

  const admitAllWaitingUsers = useCallback(() => {
    if (state.roomId && state.isHost) {
      state.waitingUsers.forEach((user) => {
        roomServiceRef.current?.admitUser(state.roomId!, user.id);
      });
    }
  }, [state.roomId, state.isHost, state.waitingUsers]);

  const toggleRoomLock = useCallback(() => {
    if (state.roomId && state.isHost) {
      roomServiceRef.current?.toggleLock(state.roomId);
    }
  }, [state.roomId, state.isHost]);

  const startYoutubeVideo = useCallback((videoId: string) => {
    if (state.roomId && user) {
      const presenterName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'Guest';
      logger.debug('[DEBUG] Emitting start-youtube:', { roomId: state.roomId, videoId, presenterName });
      signalingRef.current?.emit('start-youtube', { 
        roomId: state.roomId, 
        videoId, 
        presenterName 
      });
      
      // State will be updated via 'youtube-started' event which is now broadcast to all (including sender)
    }
  }, [state.roomId, user]);

  const stopYoutubeVideo = useCallback(() => {
    if (state.roomId) {
      signalingRef.current?.emit('close-youtube', { roomId: state.roomId });
      
      // State will be updated via 'youtube-closed' event which is now broadcast to all (including sender)
    }
  }, [state.roomId]);

  const playYoutubeVideo = useCallback((time: number) => {
    if (state.roomId) {
      signalingRef.current?.emit('play-youtube', { roomId: state.roomId, time });
    }
  }, [state.roomId]);

  const pauseYoutubeVideo = useCallback((time: number) => {
    if (state.roomId) {
      signalingRef.current?.emit('pause-youtube', { roomId: state.roomId, time });
    }
  }, [state.roomId]);

  const seekYoutubeVideo = useCallback((time: number) => {
    if (state.roomId) {
      signalingRef.current?.emit('seek-youtube', { roomId: state.roomId, time });
    }
  }, [state.roomId]);

  const promoteToCoHost = useCallback((userId: string) => {
    if (state.roomId && state.isHost) {
      roomServiceRef.current?.promoteToCohost(state.roomId, userId);
    }
  }, [state.roomId, state.isHost]);

  const demoteFromCoHost = useCallback((userId: string) => {
    if (state.roomId && state.isHost) {
      roomServiceRef.current?.demoteFromCohost(state.roomId, userId);
    }
  }, [state.roomId, state.isHost]);

  const changeVideoDevice = useCallback(async (deviceId: string) => {
    localStorage.setItem('preferredVideoDeviceId', deviceId);
    setState(prev => ({ ...prev, selectedVideoDeviceId: deviceId }));
    if (state.localStream) {
      // Restart media to use new device
      state.localStream.getTracks().forEach(t => t.stop());
      await enableMedia();
    }
  }, [state.localStream, enableMedia]);

  const changeAudioDevice = useCallback(async (deviceId: string) => {
    localStorage.setItem('preferredAudioDeviceId', deviceId);
    setState(prev => ({ ...prev, selectedAudioDeviceId: deviceId }));
    if (state.localStream) {
      state.localStream.getTracks().forEach(t => t.stop());
      await enableMedia();
    }
  }, [state.localStream, enableMedia]);

  const startGame = useCallback((type: 'xoxo' | 'ultimate-xoxo' | 'chess' | 'ludo' | 'snakeladder' | 'connect4' | 'checkers' | 'battleship', players: string[], config?: Record<string, unknown>) => {
    if (state.roomId) {
      signalingRef.current?.emit('start-game', { roomId: state.roomId, type, players, config });
    }
  }, [state.roomId]);

  const makeGameMove = useCallback((move: unknown) => {
    if (state.roomId) {
      signalingRef.current?.emit('make-game-move', { roomId: state.roomId, move });
    }
  }, [state.roomId]);

  const endGame = useCallback(() => {
    if (state.roomId) {
      signalingRef.current?.emit('end-game', { roomId: state.roomId });
    }
  }, [state.roomId]);

  const muteUser = useCallback((userId: string) => {
    if (state.roomId && state.isHost) {
      roomServiceRef.current?.muteUser(state.roomId, userId);
    }
  }, [state.roomId, state.isHost]);

  const checkRoom = useCallback((roomId: string): Promise<{ success: boolean; error?: string; [key: string]: unknown }> => {
    return new Promise((resolve) => {
        // Fallback to fetch if socket not connected (though socket is preferred)
        if (!signalingRef.current?.connected) {
             // Try fetch as last resort
             let baseUrl: string;
             if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                 baseUrl = 'https://localhost:3001';
             } else {
                 baseUrl = window.location.origin;
             }
             
             if (baseUrl.startsWith('ws:')) baseUrl = baseUrl.replace('ws:', 'http:');
             else if (baseUrl.startsWith('wss:')) baseUrl = baseUrl.replace('wss:', 'https:');
             
             fetch(`${baseUrl}/api/room-info/${roomId}`)
                 .then(res => {
                     if (!res.ok) throw new Error('Not found');
                     return res.json();
                 })
                 .then(data => resolve({ ...data, success: true }))
                 .catch(() => resolve({ success: false, error: 'Connection failed' }));
             return;
        }

        // Use Socket
        signalingRef.current.emit('check-room', { roomId }, (response: { success: boolean; error?: string; [key: string]: unknown }) => {
             resolve(response);
        });
    });
  }, []);

  const getRecentRooms = useCallback(async (callback?: (rooms: unknown[]) => void) => {
     // Priority: Socket > Fetch
    if (signalingRef.current?.connected) {
         signalingRef.current.emit('get-rooms', (rooms: unknown[]) => {
              logger.info('[WebSocketContext] Socket get-rooms response:', Array.isArray(rooms) ? rooms.length : 'Invalid Type');
              if (callback) callback(Array.isArray(rooms) ? rooms : []);
         });
         return;
    }

    try {
      // Dynamic WebSocket URL determination
      let wsUrl = import.meta.env.VITE_WS_URL;
      
      let baseUrl: string;
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          wsUrl = 'https://localhost:3001';
          baseUrl = wsUrl;
      } else {
          // Use proxy via current origin
          baseUrl = window.location.origin;
      }
      
      // Cleanup if wsUrl was used to derive baseUrl
      if (baseUrl.startsWith('ws:')) baseUrl = baseUrl.replace('ws:', 'http:');
      else if (baseUrl.startsWith('wss:')) baseUrl = baseUrl.replace('wss:', 'https:');
      
      const response = await fetch(`${baseUrl}/api/rooms`);
      if (response.ok) {
        const rooms = await response.json();
        logger.info('[WebSocketContext] Fetched recent rooms:', Array.isArray(rooms) ? rooms.length : 'Invalid Type');
        if (callback) callback(Array.isArray(rooms) ? rooms : []);
      } else {
        logger.warn('[WebSocketContext] Failed to fetch rooms:', response.status);
        if (callback) callback([]);
      }
    } catch (e) {
      logger.error('[WebSocketContext] Error fetching recent rooms:', e);
      if (callback) callback([]);
    }
  }, []);

  const startVirtualBrowser = useCallback((url: string) => {
    if (state.roomId) {
      logger.info('[WebSocketContext] ===== STARTING VIRTUAL BROWSER =====');
      logger.info('[WebSocketContext] Room ID:', state.roomId);
      logger.info('[WebSocketContext] URL:', url);
      logger.info('[WebSocketContext] Socket connected:', signalingRef.current?.connected);
      signalingRef.current?.emit('start-browser', { roomId: state.roomId, url });
      logger.info('[WebSocketContext] start-browser event emitted');
    } else {
      logger.error('[WebSocketContext] ❌ Cannot start virtual browser: no roomId');
      logger.info('[WebSocketContext] Current state:', { isConnected: state.isConnected, roomId: state.roomId });
    }
  }, [state.roomId, state.isConnected]);

  const generateSummary = useCallback((options: { broadcast?: boolean } = {}) => {
    if (state.roomId) {
        const { broadcast = true } = options;
        logger.info('[WebSocketContext] Generating summary for room:', state.roomId, 'Broadcast:', broadcast);
        signalingRef.current?.emit('generate-summary', { roomId: state.roomId, broadcast });
        toast({ title: 'Thinking...', description: broadcast ? 'Generating meeting summary for everyone.' : 'Generating your private catch-up summary.' });
    }
  }, [state.roomId]);

  const updateVirtualBrowserUrl = useCallback((url: string) => {
    if (state.roomId) {
      signalingRef.current?.emit('update-browser-url', { roomId: state.roomId, url });
    }
  }, [state.roomId]);

  const closeVirtualBrowser = useCallback(() => {
    if (state.roomId) {
      signalingRef.current?.emit('close-browser', { roomId: state.roomId });
    }
  }, [state.roomId]);

  const closePresentedFile = useCallback(() => {
    if (state.roomId) {
      signalingRef.current?.emit('stop-presentation', { roomId: state.roomId });
      setState(prev => ({ ...prev, presentedFile: null, isPresentingFile: false, presenterName: null }));
    }
  }, [state.roomId]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Room Intelligence Functions
  const analyzeRoom = useCallback(async (roomId: string): Promise<{ success: boolean; mode: RoomMode; config: RoomModeConfig; confidence: number; activityType: string }> => {
    return new Promise((resolve) => {
      signalingRef.current?.emit('analyze-room', { roomId }, (response: { success: boolean; mode: RoomMode; config: RoomModeConfig; confidence: number; activityType: string }) => {
        resolve(response);
      });
    });
  }, []);

  const applyRoomMode = useCallback(async (mode: RoomMode, targetRoomId?: string): Promise<boolean> => {
    const roomId = targetRoomId || stateRef.current.roomId;
    if (!roomId) return false;
    
    return new Promise((resolve) => {
      signalingRef.current?.emit('apply-room-mode', { roomId, mode }, (response: { success: boolean; config: RoomModeConfig }) => {
        if (response.success) {
          setState(prev => ({
            ...prev,
            roomMode: mode,
            roomModeConfig: response.config
          }));
        }
        resolve(response.success || false);
      });
    });
  }, []);

  const getRoomSuggestions = useCallback(async (roomId: string): Promise<RoomSuggestion> => {
    return new Promise((resolve) => {
      signalingRef.current?.emit('get-room-suggestions', { roomId }, (response: RoomSuggestion) => {
        resolve(response);
      });
    });
  }, []);

  const mappedUser: User | null = user ? {
    id: user.id,
    name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Guest',
    photoUrl: user.user_metadata?.avatar_url,
    isHost: state.isHost,
  } : null;

  const value: WebSocketContextType = {
    ...state,
    socket: signalingRef.current?.rawSocket || null,
    signaling: signalingRef.current,
    isVirtualBrowserActive: state.isVirtualBrowserActive,
    effectiveUserId: user?.id || guestIdentity?.id || null, // Derived from auth or guest
    user: mappedUser,
    joinRoom,
    createRoom,
    leaveRoom,
    sendMessage,
    uploadFile,
    sendFile,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    disbandRoom,
    endSession,
    kickUser,
    muteUser,
    updateRoomSettings,
    admitUser,
    denyUser,
    admitAllWaitingUsers,
    toggleRoomLock,
    startYoutubeVideo,
    stopYoutubeVideo,
    playYoutubeVideo,
    pauseYoutubeVideo,
    seekYoutubeVideo,
    promoteToCoHost,
    demoteFromCoHost,
    changeVideoDevice,
    changeAudioDevice,
    getRecentRooms,
    startVirtualBrowser,
    updateVirtualBrowserUrl,
    closeVirtualBrowser,
    closePresentedFile,
    clearError,
    enableMedia,
    disableMedia,
    toggleNoiseSuppression, // Added
    toggleAutoFraming, // Added
    checkRoom,
    presentFile: (file: FileData) => {
      if (state.roomId) {
        signalingRef.current?.emit('present-file', { 
          roomId: state.roomId, 
          file,
          presenterName: file.userName 
        });
      }
    },
    presentFileFromUpload: useCallback(async (file: File): Promise<boolean> => {
      if (!state.roomId || !user) return false;

      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            const fileData: FileData = {
              id: crypto.randomUUID(),
              userId: user.id,
              userName: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Guest',
              name: file.name,
              size: file.size,
              type: file.type,
              content: e.target.result as string, // Base64 content
              timestamp: new Date(),
            };

            // Update local state to show the file
            setState(prev => ({
              ...prev,
              presentedFile: fileData,
              isPresentingFile: true,
              presenterName: fileData.userName,
            }));

            // Broadcast to other participants
            if (state.roomId) {
              signalingRef.current?.emit('present-file', { 
                roomId: state.roomId, 
                file: fileData,
                presenterName: fileData.userName 
              });
              resolve(true);
            } else {
              resolve(false);
            }
          }
        };
        reader.readAsDataURL(file);
      });
    }, [state.roomId, user]),
    toggleScreenShare: () => {
      if (state.isScreenSharing) {
        stopScreenShare();
      } else {
        startScreenShare();
      }
    },
    startGame,
    makeGameMove,
    gameTimeout: useCallback(() => {
        if (state.roomId) {
            signalingRef.current?.emit('game-timeout', { roomId: state.roomId });
        }
    }, [state.roomId]),
    endGame,
    generateSummary,
    analyzeRoom,
    applyRoomMode,
    getRoomSuggestions,
    verifyRoomPassword: useCallback(async (password: string): Promise<boolean> => {
        if (!state.roomId) return false;
        return new Promise((resolve) => {
            signalingRef.current?.emit('verify-room-password', { roomId: state.roomId, password }, (response: { success: boolean; error?: string }) => {
                resolve(response.success);
            });
        });
    }, [state.roomId]),
    toggleAiAssist: useCallback(() => {
      setState(prev => {
        const nextActive = !prev.isAiActive;
        if (nextActive) {
            toast({ 
                title: "AI ASSIST MODE: ACTIVATED", 
                description: "Cospira Intelligence is now providing live navigational support."
            });
        } else {
            toast({ 
                title: "AI ASSIST MODE: STANDBY", 
                description: "Intelligence layer has reverted to background monitoring."
            });
        }
        return { ...prev, isAiActive: nextActive };
      });
    }, []),
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};
