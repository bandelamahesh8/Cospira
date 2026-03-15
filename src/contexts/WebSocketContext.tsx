import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePresence } from '@/hooks/usePresence';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { SignalingService } from '@/services/SignalingService';
import { SFUManager } from '@/services/SFUManager';
import { RoomSocketService } from '@/domains/rooms';
import { ActivityTracker } from '@/services/ActivityTracker';
import { logger } from '@/utils/logger';
import { User, FileData, Message, RoomInfo, TimerType, TimerAction } from '@/types/websocket';
import { WebSocketContext, WebSocketState, WebSocketContextType } from './WebSocketContextValue';
import { useMediaStream } from './WebSocket/useMediaStream';
import { useSocketEvents } from './WebSocket/useSocketEvents';
import STTService from '@/services/ai/STTService';
import { generateUUID } from '@/utils/uuid';
import { RoomMode, RoomModeConfig, RoomSuggestion } from '@/services/RoomIntelligence';
import { SecurityService } from '@/services/SecurityService';
import { roomEventBus } from '@/lib/breakout/EventBus';
import { useOrganization } from '@/contexts/useOrganization';
import { useBreakout } from '@/contexts/useBreakout';
import { getApiUrl } from '@/utils/url';

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
    organizationName: null,
    recentRooms: [],
    users: [],
    messages: [],
    files: [],
    error: null,
    isHost: false,
    isSuperHost: false,
    isGhost: false,
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
    roomCreatedAt: null,
    autoApprove: false,
    stopJoiningTime: 0,
  });
  
  const effectiveUserId = user?.id || guestIdentity?.id;

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
          isScreenShare,
        });
      }

      // Ensure track is enabled
      track.enabled = true;

      setState((prev) => {
        // targetMap is based on whether it's screen share or webcam
        const targetMapKey = isScreenShare ? 'remoteScreenStreams' : 'remoteStreams';
        const newStreamsMap = new Map(prev[targetMapKey]);
        const uid = String(userId);

        // Get existing tracks from current stream if it exists
        const oldStream = newStreamsMap.get(uid);
        const oldTracks = oldStream ? oldStream.getTracks() : [];

        // Remove any existing track of the same kind to avoid duplicates
        const filteredTracks = oldTracks.filter((t) => t.kind !== track.kind);

        // Create a NEW MediaStream object with combined tracks to trigger React re-renders in VideoTile
        const newStream = new MediaStream([...filteredTracks, track]);

        // Update the map with the new stream object
        newStreamsMap.set(uid, newStream);

        // When receiving a remote audio track (e.g. mobile mic), ensure this user is not shown as muted
        // so the web plays audio even if user:media-state was reordered or lost.
        // Ignore 'virtual-browser' to prevent it from showing up as a 'Guest' ghost user.
        let nextUsers = prev.users;
        if (kind === 'audio' && !isScreenShare && String(uid) !== 'virtual-browser') {
          const hasUser = nextUsers.some((u) => String(u.id) === uid);
          if (hasUser) {
            nextUsers = nextUsers.map((u) => (String(u.id) === uid ? { ...u, isMuted: false } : u));
          } else {
            // ONLY create a temporary Guest if absolutely necessary to show the stream immediately.
            // useSocketEvents onUserJoined will eventually update this with the real name.
            logger.info('[WebSocketContext] Creating temporary user for incoming track:', uid);
            nextUsers = [
              ...nextUsers,
              { id: uid, name: 'Guest', isMuted: false, isVideoOn: false },
            ];
          }
        }

        return { ...prev, [targetMapKey]: newStreamsMap, users: nextUsers };
      });

      // Handle track ended event
      track.onended = () => {
        logger.info(`[WebSocketContext] Track ${track.id} ended for user ${userId}`);
        setState((prev) => {
          const targetMapKey = isScreenShare ? 'remoteScreenStreams' : 'remoteStreams';
          const newStreams = new Map(prev[targetMapKey]);
          const stream = newStreams.get(String(userId));

          if (stream) {
            stream.getTracks().forEach((t) => {
              if (t.id === track.id) {
                stream.removeTrack(t);
              }
            });
            if (stream.getTracks().length === 0) {
              newStreams.delete(String(userId));
              logger.info(
                `[WebSocketContext] Removed empty stream for user ${userId} (${targetMapKey})`
              );
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

    // Logic: Favor current origin if on localhost OR a local network IP.
    // This ensures Option A (Local Network) works without external tunnel interference.
    const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1';
    const isLanIp = hostname.startsWith('192.168.') || 
                    hostname.startsWith('10.') || 
                    (hostname.startsWith('172.') && parseInt(hostname.split('.')[1]) >= 16 && parseInt(hostname.split('.')[1]) <= 31);

    if (isLocalHost) {
      wsUrl = `${protocol}//${hostname}:3001`;
    } else if (isLanIp || !wsUrl) {
      // Use current origin for LAN IPs or if no env var is set
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
          setState((prev) => ({ ...prev, recentRooms: rooms }));
        }
      });
    } catch (error) {
      logger.error('Failed to initialize signaling connection:', error);
      setState((prev) => ({
        ...prev,
        isConnected: false,
        error: `Failed to connect to server: ${error instanceof Error ? error.message : String(error)}`,
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
    setLocalStream: (stream) => setState((prev) => ({ ...prev, localStream: stream })),
    setLocalScreenStream: (stream) => setState((prev) => ({ ...prev, localScreenStream: stream })),
    setIsAudioEnabled: (enabled) => setState((prev) => ({ ...prev, isAudioEnabled: enabled })),
    setIsVideoEnabled: (enabled) => setState((prev) => ({ ...prev, isVideoEnabled: enabled })),
    setIsScreenSharing: (sharing) => setState((prev) => ({ ...prev, isScreenSharing: sharing })),
    setIsMediaLoading: (loading) => setState((prev) => ({ ...prev, isMediaLoading: loading })),
    setIsNoiseSuppressionEnabled: (enabled) =>
      setState((prev) => ({ ...prev, isNoiseSuppressionEnabled: enabled })),
    setIsAutoFramingEnabled: (enabled) =>
      setState((prev) => ({ ...prev, isAutoFramingEnabled: enabled })),
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
    setState((prev) => ({
      ...prev,
      isAway,
      users: prev.users.map((u) => (u.id === currentUserId ? { ...u, status } : u)),
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
                  timestamp: new Date().toISOString(),
                });

                setState((prev) => ({
                  ...prev,
                  lastTranscript: {
                    id: generateUUID(),
                    text,
                    userId: user?.id || guestIdentity?.id || 'me',
                    userName: user?.user_metadata?.display_name || 'You',
                    timestamp: new Date(),
                    isFinal: true,
                  },
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
  }, [
    state.isAudioEnabled,
    state.localStream,
    state.isConnected,
    state.roomId,
    user?.id,
    guestIdentity?.id,
    user?.user_metadata?.display_name,
  ]);

  // Methods
  const joinRoom = useCallback(
    (
      roomId: string,
      password?: string,
      inviteToken?: string,
      onSuccess?: () => void,
      onError?: (error: string) => void,
      isGhost?: boolean
    ) => {
      // Guest handling: If no user, use persisted guest identity
      let currentGuest = guestIdentity;
      if (!user && !currentGuest) {
        const newId = generateUUID();
        currentGuest = {
          id: newId,
          name: `Guest ${newId.substring(0, 4).toUpperCase()}`,
        };
        setGuestIdentity(currentGuest);
        localStorage.setItem('cospira_guest_identity', JSON.stringify(currentGuest));
      }

      const userData = {
        id: user?.id || currentGuest!.id,
        name: user?.user_metadata?.display_name || user?.email?.split('@')[0] || currentGuest!.name,
        photoUrl: user?.user_metadata?.photo_url || null,
        gender: user?.user_metadata?.gender || 'other',
        isGuest: !user,
      };

      logger.info('[WebSocketContext] Joining room with user data:', {
        roomId,
        userData,
        isGhost,
        fullUser: user ? { id: user.id, email: user.email, metadata: user.user_metadata } : 'Guest',
      });

      if (roomServiceRef.current) {
        roomServiceRef.current
          .joinRoom({ roomId, password, inviteToken, user: userData, isGhost })
          .then((response) => {
            if (response.status === 'WAITING_LOBBY' || response.error === 'waiting') {
              setState((prev) => ({ ...prev, isWaiting: true, error: null }));
              if (onSuccess) onSuccess();
              return;
            }

            if (!response.success) {
              if (onError) {
                onError(response.error || 'Unknown error');
              } else {
                setState((prev) => ({ ...prev, error: response.error || 'Unknown error' }));
                toast.error('Join Failed', {
                  description: response.error,
                });
              }
            } else if (response.room) {
              logger.info(
                '[WebSocketContext] Join room callback received, waiting for room-joined event'
              );
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

  useSocketEvents({
    signalingRef,
    sfuManagerRef,
    state,
    setState,
    signOut,
    navigate,
    currentUserId: user?.id || guestIdentity?.id || null,
    joinRoom,
  });

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

    const onChatMessage = (data: { sender: string; content: string; timestamp: string }) => {
      setState((prev) => ({
        ...prev,
        chatMessages: [
          ...(prev.chatMessages || []),
          {
            id: generateUUID(),
            userId: 'unknown', // Server should send this
            userName: data.sender,
            content: data.content,
            timestamp: new Date(data.timestamp),
            type: 'global',
          },
        ],
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
              toast.success('Session Restored', { description: 'Welcome back!' });
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
        toast.error('Connection Error', {
          description: 'Cannot create room: Disconnected from server',
        });
        return;
      }

      let currentGuest = guestIdentity;
      if (!user && !currentGuest) {
        const newId = generateUUID();
        currentGuest = {
          id: newId,
          name: `Guest ${newId.substring(0, 4).toUpperCase()}`,
        };
        setGuestIdentity(currentGuest);
        localStorage.setItem('cospira_guest_identity', JSON.stringify(currentGuest));
      }

      const userData = {
        id: user?.id || currentGuest!.id,
        name: user?.user_metadata?.display_name || user?.email?.split('@')[0] || currentGuest!.name,
        isGuest: !user,
      };

      if (roomServiceRef.current) {
        roomServiceRef.current
          .createRoom({
            roomId,
            roomName,
            password,
            accessType,
            user: userData,
            orgId,
            settings: { ...settings, mode: (settings?.mode as string) || 'fun' }, // Ensure mode is in settings
            roomMode: (settings?.mode as string) || 'fun', // Top level fallback
          })
          .then(() => {
            joinRoom(roomId, password, undefined, onSuccess);
          })
          .catch((err) => {
            if (err === 'Room already exists') {
              joinRoom(roomId, password, undefined, onSuccess);
            } else {
              toast.error('Error', { description: err });
            }
          });
      }
    },
    [user, joinRoom, guestIdentity, state.isConnected]
  );

  const sendMessage = useCallback(
    (content: string) => {
      if (!state.roomId) return;

      // Check for commands
      if (content.startsWith('/')) {
        signalingRef.current?.emit(
          'assistant:command',
          {
            roomId: state.roomId,
            text: content,
          },
          (res: { success: boolean; error?: string }) => {
            if (!res.success) {
              toast.error('AI Error', {
                description: res.error || 'Failed to process command',
              });
            }
          }
        );
        return;
      }

      if (user || guestIdentity) {
        // Security Check: Rate Limit
        if (!SecurityService.canPerformAction('chat')) {
          toast.error('Slow Down', {
            description: 'You are sending messages too fast.',
          });
          return;
        }

        // Security Check: Sanitize
        const sanitizedContent = SecurityService.sanitizeInput(content);
        if (!sanitizedContent) return;

        // Optimistic Update: Add message locally before sending
        const tempId = generateUUID();
        const optimisticMessage: Message = {
          id: tempId,
          userId: user?.id || guestIdentity?.id || 'me',
          userName:
            user?.user_metadata?.display_name ||
            user?.email?.split('@')[0] ||
            guestIdentity?.name ||
            'You',
          content: sanitizedContent,
          timestamp: new Date(),
          pending: true,
        };

        setState((prev) => ({
          ...prev,
          messages: [...(prev.messages || []), optimisticMessage],
        }));

        const messageData = {
          roomId: state.roomId,
          message: {
            id: tempId,
            content: sanitizedContent,
          },
        };

        signalingRef.current?.emit(
          'send-message',
          messageData,
          (response?: { success: boolean }) => {
            if (response?.success) {
              // Track message sent activity
              if (activityTrackerRef.current && state.roomId) {
                activityTrackerRef.current.trackMessageSent(state.roomId);
              }
              // Note: Deduplication happens in useSocketEvents' onNewMessage
            } else {
              toast.error('Error', {
                description: 'Failed to send message',
              });
              // Remove the failed message
              setState((prev) => ({
                ...prev,
                messages: prev.messages.filter((m) => m.id !== tempId),
              }));
            }
          }
        );
      }
    },
    [state.roomId, user, guestIdentity]
  );

  const uploadFile = useCallback(
    async (file: File): Promise<boolean> => {
      logger.info('[WebSocketContext] uploadFile called for:', file.name);
      const rid = stateRef.current.roomId;
      const currentUserId = effectiveUserId;
      if (!rid || !currentUserId) {
        logger.warn('[uploadFile] Missing roomId or userId. Aborting.');
        toast.error('Sync Error', {
          description: 'Your connection session is out of sync. Please refresh to restore persistent identity.'
        });
        return false;
      }

      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const tid = `upload-generic-${Date.now()}`;
        
        logger.info('[WebSocketContext] Generic XHR created, tid:', tid);
        // Use toast.loading as the base, then trigger XHR
        toast.loading(`Syncing ${file.name}: 0%`, { id: tid });

        const uploadTask = new Promise((resolvePromise, rejectPromise) => {
          xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
              const percent = Math.round((event.loaded / event.total) * 100);
              toast.loading(`Syncing ${file.name}: ${percent}%`, { id: tid });
            }
          });
          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const data = JSON.parse(xhr.responseText);
                if (data.success && data.file) {
                  const fileData: FileData = {
                    ...data.file,
                    userId: currentUserId,
                    userName: user?.user_metadata?.display_name || user?.email?.split('@')[0] || guestIdentity?.name || 'Guest',
                  };
                  signalingRef.current?.emit(
                    'upload-file',
                    { roomId: rid, file: fileData },
                    (uploadResponse?: { success: boolean; error?: string }) => {
                      if (uploadResponse?.success) {
                        if (activityTrackerRef.current) {
                          activityTrackerRef.current.trackFileShared(rid, file.name);
                        }
                        
                        // Update local state IMMEDIATELY for zero-lag feedback
                        setState((prev) => ({
                          ...prev,
                          presentedFile: fileData,
                          isPresentingFile: true,
                          presenterName: fileData.userName,
                        }));

                        // Automatically present the file immediately after successful upload
                        signalingRef.current?.emit('present-file', { 
                          roomId: rid, 
                          fileData: fileData, 
                          presenterName: fileData.userName 
                        });

                        resolvePromise(true);
                        resolve(true);
                      } else {
                        const err = new Error(uploadResponse?.error || 'Sync Failed');
                        rejectPromise(err);
                        reject(err);
                      }
                    }
                  );
                } else {
                  const err = new Error('Incomplete data received');
                  rejectPromise(err);
                  reject(err);
                }
              } catch (e) {
                rejectPromise(e);
                reject(e);
              }
            } else {
              const err = new Error(`Upload Failed: ${xhr.statusText}`);
              rejectPromise(err);
              reject(err);
            }
          });

          xhr.addEventListener('error', () => {
             const err = new Error('Network Error during upload');
             rejectPromise(err);
             reject(err);
          });

          const formData = new FormData();
          formData.append('file', file);
          const uploadUrl = getApiUrl(`/upload?roomId=${rid}`);
          
          xhr.open('POST', uploadUrl);
          // Bypassing ngrok warning for the upload request
          xhr.setRequestHeader('ngrok-skip-browser-warning', 'true');
          xhr.send(formData);
        });

        // Mirror the internal promise state via toast.promise for final UI feedback
        toast.promise(uploadTask, {
          id: tid,
          loading: `Syncing ${file.name}: 0%`,
          success: `Asset "${file.name}" synchronized.`,
          error: (err: Error) => `Sync Error: ${err.message}`,
        });
      });
    },
    [user, guestIdentity, effectiveUserId]
  );

  const sendFile = uploadFile;

  const leaveRoom = useCallback(
    (options?: { keepMedia?: boolean }) => {
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
          roomCreatedAt: null,
        }));
      }
    },
    [state.roomId, disableMedia]
  );

  const { currentOrganization, deleteOrganization } = useOrganization();
  const { deleteBreakout } = useBreakout();

  const disbandRoom = useCallback(async (isMainRoomOverride?: boolean) => {
    if (!state.roomId) return;

    const isMainRoom = isMainRoomOverride ?? (state.roomId === currentOrganization?.id);
    
    // Logic:
    // 1. Breakout rooms can be disbanded by hosts.
    // 2. Main room can ONLY be disbanded by super hosts.
    
    let canDisband = false;
    if (isMainRoom) {
      canDisband = state.isSuperHost;
    } else {
      canDisband = state.isHost || state.isSuperHost;
    }

    if (!canDisband) {
      toast.error('Permission Denied', {
        description: isMainRoom 
          ? 'Only Super Hosts can disband the main organization room.' 
          : 'You do not have permission to disband this room.',
      });
      return;
    }

    logger.info(`[WebSocketContext] Disbanding room: ${state.roomId} (Main: ${isMainRoom}, SuperHost: ${state.isSuperHost})`);
    
    try {
      if (isMainRoom && currentOrganization?.id) {
        logger.info(`[WebSocketContext] Disbanding organization: ${currentOrganization.id}`);
        
        // Phase 1: Soft-delete in Supabase via context to ensure state sync
        await deleteOrganization(currentOrganization.id);
        
        // Phase 2: Notify server to cleanup Redis/Socket state
        signalingRef.current?.emit('disband-room', { 
          roomId: state.roomId,
          isMainRoom: true,
          orgId: currentOrganization.id
        });

        toast.success('Organization Disbanded', {
          description: 'The organization and all its sectors have been decommissioned.',
        });

        // Phase 3: Immediate redirection for the conductor
        navigate('/');
      } else {
        // DELETE THE BREAKOUT
        // Only attempt to delete from Supabase if it looks like a UUID (real breakout)
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(state.roomId);
        if (isUUID) {
          try {
            await deleteBreakout(state.roomId);
          } catch (e) {
            logger.warn('[WebSocketContext] Could not delete breakout record, might be a non-Supabase room:', e);
          }
        }
        
        // Notify server to eject everyone else with a callback for safe navigation
        roomServiceRef.current?.disbandRoom(state.roomId, (res: { success: boolean }) => {
          if (res.success) {
            navigate('/dashboard');
          }
        });
        
        // Safety timeout for navigation in case socket callback hangs
        setTimeout(() => {
          if (window.location.pathname.includes(state.roomId || '')) {
             navigate('/dashboard');
          }
        }, 3000);
        
        toast.success('Sector Terminated', { description: 'The room has been closed.' });
      }

      // Clean up local state locally anyway
      setState((prev) => ({
        ...prev,
        roomId: null,
        isHost: false,
        isSuperHost: false,
        currentFile: null,
      }));

      roomEventBus.emit('ROOM_STATE_CHANGE', {
        breakoutId: state.roomId,
        status: 'CLOSED'
      });
    } catch (err) {
      logger.error('Failed to disband room:', err);
      toast.error('Disband Failed', {
        description: 'An error occurred while trying to disband the room.',
      });
      throw err;
    }
  }, [state.roomId, state.isHost, state.isSuperHost, currentOrganization, deleteBreakout, navigate, deleteOrganization]);

  const endSession = useCallback(() => {
    if (state.roomId && state.isHost) {
      signalingRef.current?.emit('end-session', { roomId: state.roomId });
    }
  }, [state.roomId, state.isHost]);

  const kickUser = useCallback(
    (userId: string) => {
      if (state.roomId && state.isHost) {
        roomServiceRef.current?.kickUser(state.roomId, userId);
      }
    },
    [state.roomId, state.isHost]
  );

  const updateRoomSettings = useCallback(
    (settings: Record<string, unknown>) => {
      if (state.roomId && (state.isHost || state.isSuperHost)) {
        roomServiceRef.current?.updateSettings(state.roomId, settings);
      }
    },
    [state.roomId, state.isHost, state.isSuperHost]
  );

  const admitUser = useCallback(
    (userId: string) => {
      if (state.roomId && state.isHost) {
        roomServiceRef.current?.admitUser(state.roomId, userId);
      }
    },
    [state.roomId, state.isHost]
  );

  const denyUser = useCallback(
    (userId: string) => {
      if (state.roomId && state.isHost) {
        roomServiceRef.current?.denyUser(state.roomId, userId);
      }
    },
    [state.roomId, state.isHost]
  );

  const admitAllWaitingUsers = useCallback(() => {
    if (state.roomId && state.isHost) {
      state.waitingUsers.forEach((user) => {
        roomServiceRef.current?.admitUser(state.roomId!, user.id);
      });
    }
  }, [state.roomId, state.isHost, state.waitingUsers]);

  const toggleRoomLock = useCallback(() => {
    if (state.roomId && state.isHost) {
      roomServiceRef.current?.toggleLock(state.roomId, !state.isRoomLocked);
    }
  }, [state.roomId, state.isHost, state.isRoomLocked]);

  const startYoutubeVideo = useCallback(
    (videoId: string) => {
      if (state.roomId && user) {
        const presenterName =
          user.user_metadata?.display_name || user.email?.split('@')[0] || 'Guest';
        logger.debug('[DEBUG] Emitting start-youtube:', {
          roomId: state.roomId,
          videoId,
          presenterName,
        });
        signalingRef.current?.emit('start-youtube', {
          roomId: state.roomId,
          videoId,
          presenterName,
        });

        // State will be updated via 'youtube-started' event which is now broadcast to all (including sender)
      }
    },
    [state.roomId, user]
  );

  const stopYoutubeVideo = useCallback(() => {
    if (state.roomId) {
      signalingRef.current?.emit('close-youtube', { roomId: state.roomId });

      // State will be updated via 'youtube-closed' event which is now broadcast to all (including sender)
    }
  }, [state.roomId]);

  const playYoutubeVideo = useCallback(
    (time: number) => {
      if (state.roomId) {
        signalingRef.current?.emit('play-youtube', { roomId: state.roomId, time });
      }
    },
    [state.roomId]
  );

  const pauseYoutubeVideo = useCallback(
    (time: number) => {
      if (state.roomId) {
        signalingRef.current?.emit('pause-youtube', { roomId: state.roomId, time });
      }
    },
    [state.roomId]
  );

  const seekYoutubeVideo = useCallback(
    (time: number) => {
      if (state.roomId) {
        signalingRef.current?.emit('seek-youtube', { roomId: state.roomId, time });
      }
    },
    [state.roomId]
  );

  const promoteToCoHost = useCallback(
    (userId: string) => {
      if (state.roomId && state.isHost) {
        roomServiceRef.current?.promoteToCohost(state.roomId, userId);
      }
    },
    [state.roomId, state.isHost]
  );

  const demoteFromCoHost = useCallback(
    (userId: string) => {
      if (state.roomId && state.isHost) {
        roomServiceRef.current?.demoteFromCohost(state.roomId, userId);
      }
    },
    [state.roomId, state.isHost]
  );

  const changeVideoDevice = useCallback(
    async (deviceId: string) => {
      localStorage.setItem('preferredVideoDeviceId', deviceId);
      setState((prev) => ({ ...prev, selectedVideoDeviceId: deviceId }));
      if (state.localStream) {
        // Restart media to use new device
        state.localStream.getTracks().forEach((t) => t.stop());
        await enableMedia();
      }
    },
    [state.localStream, enableMedia]
  );

  const changeAudioDevice = useCallback(
    async (deviceId: string) => {
      localStorage.setItem('preferredAudioDeviceId', deviceId);
      setState((prev) => ({ ...prev, selectedAudioDeviceId: deviceId }));
      if (state.localStream) {
        state.localStream.getTracks().forEach((t) => t.stop());
        await enableMedia();
      }
    },
    [state.localStream, enableMedia]
  );

  const startGame = useCallback(
    (
      type:
        | 'xoxo'
        | 'ultimate-xoxo'
        | 'chess'
        | 'chess-puzzle'
        | 'ludo'
        | 'snakeladder'
        | 'connect4'
        | 'checkers'
        | 'battleship'
        | 'carrom'
        | 'kart-racing',
      players: string[],
      config?: Record<string, unknown>
    ) => {
      if (state.roomId) {
        signalingRef.current?.emit('start-game', { roomId: state.roomId, type, players, config });
      }
    },
    [state.roomId]
  );

  const makeGameMove = useCallback(
    (move: unknown) => {
      if (state.roomId) {
        signalingRef.current?.emit('make-game-move', { roomId: state.roomId, move });
      }
    },
    [state.roomId]
  );

  const endGame = useCallback(() => {
    if (state.roomId) {
      signalingRef.current?.emit('end-game', { roomId: state.roomId });
    }
  }, [state.roomId]);

  const muteUser = useCallback(
    (userId: string) => {
      if (state.roomId && state.isHost) {
        roomServiceRef.current?.muteUser(state.roomId, userId);
      }
    },
    [state.roomId, state.isHost]
  );

  const checkRoom = useCallback(
    (roomId: string): Promise<{ success: boolean; error?: string; [key: string]: unknown }> => {
      return new Promise((resolve) => {
        // Fallback to fetch if socket not connected (though socket is preferred)
        if (!signalingRef.current?.connected) {
          // Try fetch as last resort
          let baseUrl: string;
          if (
            window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1'
          ) {
            baseUrl = 'https://localhost:3001';
          } else {
            baseUrl = window.location.origin;
          }

          if (baseUrl.startsWith('ws:')) baseUrl = baseUrl.replace('ws:', 'http:');
          else if (baseUrl.startsWith('wss:')) baseUrl = baseUrl.replace('wss:', 'https:');

          fetch(`${baseUrl}/api/room-info/${roomId}`)
            .then((res) => {
              if (!res.ok) throw new Error('Not found');
              return res.json();
            })
            .then((data) => resolve({ ...data, success: true }))
            .catch(() => resolve({ success: false, error: 'Connection failed' }));
          return;
        }

        // Use Socket
        signalingRef.current.emit(
          'check-room',
          { roomId },
          (response: { success: boolean; error?: string; [key: string]: unknown }) => {
            resolve(response);
          }
        );
      });
    },
    []
  );

  const getRecentRooms = useCallback(async (callback?: (rooms: unknown[]) => void) => {
    // Priority: Socket > Fetch
    if (signalingRef.current?.connected) {
      signalingRef.current.emit('get-rooms', (rooms: unknown[]) => {
        logger.info(
          '[WebSocketContext] Socket get-rooms response:',
          Array.isArray(rooms) ? rooms.length : 'Invalid Type'
        );
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
        logger.info(
          '[WebSocketContext] Fetched recent rooms:',
          Array.isArray(rooms) ? rooms.length : 'Invalid Type'
        );
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

  const startVirtualBrowser = useCallback(
    (url: string) => {
      if (state.roomId) {
        logger.info('[WebSocketContext] ===== STARTING VIRTUAL BROWSER =====');
        logger.info('[WebSocketContext] Room ID:', state.roomId);
        logger.info('[WebSocketContext] URL:', url);
        logger.info('[WebSocketContext] Socket connected:', signalingRef.current?.connected);
        signalingRef.current?.emit('start-virtual-browser', {
          roomId: state.roomId,
          url,
          enableAudio: true,
        });
        logger.info('[WebSocketContext] start-browser event emitted');
      } else {
        logger.error('[WebSocketContext] ❌ Cannot start virtual browser: no roomId');
        logger.info('[WebSocketContext] Current state:', {
          isConnected: state.isConnected,
          roomId: state.roomId,
        });
      }
    },
    [state.roomId, state.isConnected]
  );

  const generateSummary = useCallback(
    (options: { broadcast?: boolean } = {}) => {
      if (state.roomId) {
        const { broadcast = true } = options;
        logger.info(
          '[WebSocketContext] Generating summary for room:',
          state.roomId,
          'Broadcast:',
          broadcast
        );
        signalingRef.current?.emit('generate-summary', { roomId: state.roomId, broadcast });
        toast('Thinking...', {
          description: broadcast
            ? 'Generating meeting summary for everyone.'
            : 'Generating your private catch-up summary.',
        });
      }
    },
    [state.roomId]
  );

  const updateVirtualBrowserUrl = useCallback(
    (url: string) => {
      if (state.roomId) {
        signalingRef.current?.emit('update-browser-url', { roomId: state.roomId, url });
      }
    },
    [state.roomId]
  );

  const closeVirtualBrowser = useCallback(() => {
    if (state.roomId) {
      signalingRef.current?.emit('close-browser', { roomId: state.roomId });
    }
  }, [state.roomId]);

  const closePresentedFile = useCallback(() => {
    if (state.roomId) {
      signalingRef.current?.emit('stop-presentation', { roomId: state.roomId });
      setState((prev) => ({
        ...prev,
        presentedFile: null,
        isPresentingFile: false,
        presenterName: null,
      }));
    }
  }, [state.roomId]);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  // Room Intelligence Functions
  const analyzeRoom = useCallback(
    async (
      roomId: string
    ): Promise<{
      success: boolean;
      mode: RoomMode;
      config: RoomModeConfig;
      confidence: number;
      activityType: string;
    }> => {
      return new Promise((resolve) => {
        signalingRef.current?.emit(
          'analyze-room',
          { roomId },
          (response: {
            success: boolean;
            mode: RoomMode;
            config: RoomModeConfig;
            confidence: number;
            activityType: string;
          }) => {
            resolve(response);
          }
        );
      });
    },
    []
  );

  const applyRoomMode = useCallback(
    async (mode: RoomMode, targetRoomId?: string): Promise<boolean> => {
      const roomId = targetRoomId || stateRef.current.roomId;
      if (!roomId) return false;

      return new Promise((resolve) => {
        signalingRef.current?.emit(
          'apply-room-mode',
          { roomId, mode },
          (response: { success: boolean; config: RoomModeConfig }) => {
            if (response.success) {
              setState((prev) => ({
                ...prev,
                roomMode: mode,
                roomModeConfig: response.config,
              }));
            }
            resolve(response.success || false);
          }
        );
      });
    },
    []
  );

  const getRoomSuggestions = useCallback(async (roomId: string): Promise<RoomSuggestion> => {
    return new Promise((resolve) => {
      signalingRef.current?.emit('get-room-suggestions', { roomId }, (response: RoomSuggestion) => {
        resolve(response);
      });
    });
  }, []);

  const toggleAiAssist = useCallback(() => {
    setState((prev) => {
      const nextActive = !prev.isAiActive;
      if (nextActive) {
        toast('AI ASSIST MODE: ACTIVATED', {
          description: 'Cospira Intelligence is now providing live navigational support.',
        });
      } else {
        toast('AI ASSIST MODE: STANDBY', {
          description: 'Intelligence layer has reverted to background monitoring.',
        });
      }
      return { ...prev, isAiActive: nextActive };
    });
  }, []);

  const startRoomTimer = useCallback(
    (duration: number, label: string, type?: TimerType, action?: TimerAction) => {
      if (!state.isHost && !state.isSuperHost) return;

      setState((prev) => ({
        ...prev,
        activeTimer: {
          duration,
          startedAt: Date.now(),
          label,
          type,
          action,
        },
      }));
      signalingRef.current?.emit('start-room-timer', {
        duration,
        label,
        type,
        action,
        roomId: state.roomId,
      });
    },
    [state.roomId, state.isHost, state.isSuperHost]
  );

  const presentFile = useCallback(
    (file: FileData) => {
      if (state.roomId) {
        toast('Initiating Projection', {
          description: `Projecting "${file.name}" to the main stage...`,
        });

        // Update local state immediately
        setState((prev) => ({
          ...prev,
          presentedFile: file,
          isPresentingFile: true,
          presenterName: file.userName,
        }));

        signalingRef.current?.emit('present-file', {
          roomId: state.roomId,
          fileData: file,
          presenterName: file.userName,
        });
      }
    },
    [state.roomId]
  );

  const presentFileFromUpload = useCallback(
    async (file: File): Promise<boolean> => {
      const rid = stateRef.current.roomId;
      const currentUserId = effectiveUserId;
      
      logger.info('[WebSocketContext] presentFileFromUpload initiated:', {
          fileName: file.name,
          roomId: rid,
          userId: currentUserId,
          socketConnected: signalingRef.current?.connected
      });

      if (!rid || !currentUserId) {
        logger.error('[WebSocketContext] presentFileFromUpload aborted: missing roomId or userId. State:', {
            rid: stateRef.current.roomId,
            uid: effectiveUserId,
            hasGuest: !!guestIdentity
        });
        toast.error('Session error: Join room first', {
            description: 'Your identity or room sector could not be verified.'
        });
        return false;
      }

      logger.info(`[WebSocketContext] Starting projection upload for: ${file.name}`);

      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const tid = `upload-present-${Date.now()}`;
        
        logger.info('[WebSocketContext] XHR created, tid:', tid);
        toast.loading(`Uploading ${file.name}: 0%`, { id: tid });

        const uploadTask = new Promise((resolvePromise, rejectPromise) => {
          xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
              const percent = Math.round((event.loaded / event.total) * 100);
              toast.loading(`Uploading ${file.name}: ${percent}%`, { id: tid });
            }
          });

          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const data = JSON.parse(xhr.responseText);
                if (data.success && data.file) {
                  const fileData: FileData = {
                    ...data.file,
                    userId: currentUserId,
                    userName: user?.user_metadata?.display_name || user?.email?.split('@')[0] || guestIdentity?.name || 'Guest',
                  };

                  logger.info('[WebSocketContext] Upload successful, manifesting asset Locally: ', fileData.name);

                  // Update local state IMMEDIATELY
                  setState((prev) => ({
                    ...prev,
                    presentedFile: fileData,
                    isPresentingFile: true,
                    presenterName: fileData.userName,
                  }));

                  // Broadcast signaling
                  signalingRef.current?.emit('present-file', {
                    roomId: rid,
                    fileData,
                    presenterName: fileData.userName,
                  });

                  resolvePromise(true);
                  resolve(true);
                } else {
                  logger.error('[WebSocketContext] Upload response missing data:', data);
                  const err = new Error('Incomplete data received');
                  rejectPromise(err);
                  reject(err);
                }
              } catch (e) {
                logger.error('[WebSocketContext] Error parsing upload response:', e);
                rejectPromise(e);
                reject(e);
              }
            } else {
              logger.error('[WebSocketContext] Upload failed with status:', xhr.status);
              const err = new Error(`Upload Failed: ${xhr.statusText}`);
              rejectPromise(err);
              reject(err);
            }
          });

          xhr.addEventListener('error', () => {
            const err = new Error('Network connection interrupted');
            rejectPromise(err);
            reject(err);
          });

          const formData = new FormData();
          formData.append('file', file);
          const uploadUrl = getApiUrl(`/upload?roomId=${rid}`);
          xhr.open('POST', uploadUrl);
          // Explicitly bypass ngrok interstitial for the upload request itself
          xhr.setRequestHeader('ngrok-skip-browser-warning', 'true');
          xhr.send(formData);
        });

        toast.promise(uploadTask, {
          id: tid,
          loading: `Uploading ${file.name}: 0%`,
          success: `Asset "${file.name}" manifest online.`,
          error: (err: Error) => `Projection Failed: ${err.message}`,
        });
      });
    },
    [user, guestIdentity, effectiveUserId]
  );

  const toggleScreenShare = useCallback(() => {
    if (state.isScreenSharing) {
      stopScreenShare();
    } else {
      startScreenShare();
    }
  }, [state.isScreenSharing, startScreenShare, stopScreenShare]);

  const repairMedia = useCallback(async () => {
    if (sfuManagerRef.current) {
      toast.info('Re-syncing media mesh...');
      await sfuManagerRef.current.repair();
      toast.success('Core media systems re-synchronized.');
    }
  }, []);

  const gameTimeout = useCallback(() => {
    if (state.roomId) {
      signalingRef.current?.emit('game-timeout', { roomId: state.roomId });
    }
  }, [state.roomId]);

  const verifyRoomPassword = useCallback(
    async (password: string): Promise<boolean> => {
      if (!state.roomId) return false;
      return new Promise((resolve) => {
        signalingRef.current?.emit(
          'verify-room-password',
          { roomId: state.roomId, password },
          (response: { success: boolean; error?: string }) => {
            resolve(response.success);
          }
        );
      });
    },
    [state.roomId]
  );

  const pauseRoomTimer = useCallback(() => {
    if (state.roomId) {
      logger.info('[WebSocketContext] Pausing room timer:', state.roomId);
      signalingRef.current?.emit('pause-room-timer', { roomId: state.roomId });
    }
  }, [state.roomId]);

  const resumeRoomTimer = useCallback(() => {
    if (state.roomId) {
      logger.info('[WebSocketContext] Resuming room timer:', state.roomId);
      signalingRef.current?.emit('resume-room-timer', { roomId: state.roomId });
    }
  }, [state.roomId]);

  const stopRoomTimer = useCallback(() => {
    if (state.roomId) {
      logger.info('[WebSocketContext] Stopping room timer:', state.roomId);
      signalingRef.current?.emit('stop-room-timer', { roomId: state.roomId });
    }
  }, [state.roomId]);

  const mappedUser: User | null = user
    ? {
        id: user.id,
        name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Guest',
        photoUrl: user.user_metadata?.avatar_url,
        isHost: state.isHost,
      }
    : null;

  // Capture current signaling instance for stable memoization
  const signaling = signalingRef.current;

  const value: WebSocketContextType = useMemo(() => ({
    ...state,
    socket: signaling?.rawSocket || null,
    signaling,
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
    repairMedia,
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
    presentFile,
    presentFileFromUpload,
    toggleScreenShare,
    startGame,
    makeGameMove,
    gameTimeout,
    endGame,
    generateSummary,
    analyzeRoom,
    applyRoomMode,
    getRoomSuggestions,
    verifyRoomPassword,
    toggleAiAssist,
    startRoomTimer,
    pauseRoomTimer,
    resumeRoomTimer,
    stopRoomTimer,
  }), [
    state,
    signaling,
    mappedUser,
    guestIdentity,
    joinRoom,
    createRoom,
    leaveRoom,
    sendMessage,
    uploadFile,
    sendFile,
    toggleAudio,
    toggleVideo,
    repairMedia,
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
    toggleNoiseSuppression,
    toggleAutoFraming,
    checkRoom,
    presentFile,
    presentFileFromUpload,
    toggleScreenShare,
    startGame,
    makeGameMove,
    gameTimeout,
    endGame,
    generateSummary,
    analyzeRoom,
    applyRoomMode,
    getRoomSuggestions,
    verifyRoomPassword,
    toggleAiAssist,
    startRoomTimer,
    pauseRoomTimer,
    resumeRoomTimer,
    stopRoomTimer,
  ]);

  // --- Room Timer Auto-Actions ---
  const warningIssuedRef = useRef(false);

  useEffect(() => {
    // Only the host or superhost should trigger the final auto-action to avoid duplicate signals
    const canManageTimer = state.isHost || state.isSuperHost;
    if (!state.activeTimer || !canManageTimer || state.activeTimer.isPaused) {
      warningIssuedRef.current = false;
      return;
    }

    const timer = state.activeTimer;
    const totalMs = timer.duration * 60 * 1000;
    const startedAt =
      typeof timer.startedAt === 'string' ? new Date(timer.startedAt).getTime() : timer.startedAt;
    const expiryTs = startedAt + totalMs;

    const checkExpiry = () => {
      const now = Date.now();
      const remaining = expiryTs - now;

      // Advanced Upgrade: 30-second warning
      if (remaining <= 30000 && remaining > 0 && !warningIssuedRef.current) {
        warningIssuedRef.current = true;
        toast('Mission Countdown', {
          description: `Crucial state change in 30 seconds for "${timer.label}".`,
        });
        signalingRef.current?.emit('system:announcement', {
          roomId: state.roomId,
          type: 'warning',
          message: `The timer for "${timer.label}" is entering final countdown (30s remaining).`,
        });
      }

      if (remaining <= 0) {
        if (timer.action === 'close') {
          logger.info('[TimerAction] Auto-disbanding room due to timer expiry');
          disbandRoom();
        } else if (timer.action === 'resume') {
          toast.success('Break Ended', { description: 'Protocol resuming automatically.' });
          signalingRef.current?.emit('system:announcement', {
            roomId: state.roomId,
            type: 'success',
            message: `The timer for "${timer.label}" has ended. Resuming mission protocol.`,
          });
        }
        
        // Reset local activeTimer to prevent repeat
        setState((prev) => ({ ...prev, activeTimer: null }));
        warningIssuedRef.current = false;
        clearInterval(id);
      }
    };

    const id = setInterval(checkExpiry, 1000);
    return () => {
      clearInterval(id);
    };
  }, [state.activeTimer, state.activeTimer?.startedAt, state.isHost, state.isSuperHost, disbandRoom, state.roomId]);

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
};
