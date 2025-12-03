import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { SignalingService, type SignalingEvents } from '@/lib/signaling';
import { SFUManager } from '@/lib/SFUManager';
import { User, Message, FileData, RoomInfo } from '@/types/websocket';
import { WebSocketContext, WebSocketState, WebSocketContextType, BrowserInput } from './WebSocketContextValue';
import { useMediaStream } from './WebSocket/useMediaStream';
import { useSocketEvents } from './WebSocket/useSocketEvents';

export { type WebSocketState, type WebSocketContextType };

// ICE servers will be fetched from backend
const DEFAULT_ICE_SERVERS = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

interface SocketResponse {
  success: boolean;
  error?: string;
}

interface JoinRoomResponse extends SocketResponse {
  room?: {
    id: string;
    name: string;
    users: User[];
    messages: Message[];
    files: FileData[];
    isHost: boolean;
    hasWaitingRoom: boolean;
    waitingUsers: User[];
    accessType: 'public' | 'password' | 'invite' | 'organization';
    inviteToken: string | null;
  };
}

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    roomId: null,
    roomName: null,
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
  });

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Services
  const signalingRef = useRef<SignalingService | null>(null);
  const sfuManagerRef = useRef<SFUManager | null>(null);
  const screenShareStreamIdsRef = useRef<Map<string, string>>(new Map()); // userId -> streamId
  const enableMediaRef = useRef<(() => Promise<void>) | null>(null);

  // Initialize services
  useEffect(() => {
    const url = import.meta.env.VITE_WS_URL || 'http://localhost:3001';
    signalingRef.current = new SignalingService(url);

    try {
      sfuManagerRef.current = new SFUManager(signalingRef.current, (userId, track, kind) => {
        setState((prev) => {
          const stream = new MediaStream([track]);
          const newRemoteStreams = new Map(prev.remoteStreams);
          let existingStream = newRemoteStreams.get(userId);

          if (!existingStream) {
            existingStream = new MediaStream();
            newRemoteStreams.set(userId, existingStream);
          }

          existingStream.addTrack(track);

          return { ...prev, remoteStreams: newRemoteStreams };
        });
      });
    } catch (error) {
      console.error('Failed to initialize SFUManager:', error);
    }

    signalingRef.current.connect();

    return () => {
      signalingRef.current?.disconnect();
      sfuManagerRef.current?.closeAll();
    };
  }, []);

  // Use split hooks
  const {
    enableMedia,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
  } = useMediaStream({
    sfuManagerRef,
    setLocalStream: (stream) => setState(prev => ({ ...prev, localStream: stream })),
    setLocalScreenStream: (stream) => setState(prev => ({ ...prev, localScreenStream: stream })),
    setIsAudioEnabled: (enabled) => setState(prev => ({ ...prev, isAudioEnabled: enabled })),
    setIsVideoEnabled: (enabled) => setState(prev => ({ ...prev, isVideoEnabled: enabled })),
    setIsScreenSharing: (sharing) => setState(prev => ({ ...prev, isScreenSharing: sharing })),
    setIsMediaLoading: (loading) => setState(prev => ({ ...prev, isMediaLoading: loading })),
  });

  // Store enableMedia in ref so it can be called from event handlers
  useEffect(() => {
    enableMediaRef.current = enableMedia;
  }, [enableMedia]);

  useSocketEvents({
    signalingRef,
    sfuManagerRef,
    state,
    setState,
    enableMediaRef,
    user: user ? {
      id: user.id,
      name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Guest',
    } : null,
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
      const userData = {
        id: user?.id,
        name: user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Guest',
      };
      signalingRef.current?.emit(
        'join-room',
        { roomId, password, inviteToken, user: userData },
        (response: JoinRoomResponse) => {
          if (!response.success) {
            if (onError) {
              onError(response.error || 'Unknown error');
            } else {
              setState((prev) => ({ ...prev, error: response.error || 'Unknown error' }));
              toast({ title: 'Join Failed', description: response.error, variant: 'destructive' });
            }
          } else if (response.room) {
            const roomData = response.room;
            setState((prev) => ({
              ...prev,
              roomId: roomData.id,
              roomName: roomData.name || roomData.id,
              users: roomData.users,
              messages: roomData.messages,
              files: roomData.files,
              isHost: roomData.isHost,
              hasWaitingRoom: roomData.hasWaitingRoom || false,
              waitingUsers: roomData.waitingUsers || [],
              isWaiting: false,
              accessType: roomData.accessType || 'public',
              inviteToken: roomData.inviteToken || null,
              error: null,
            }));

            // Initialize SFU connection for the joining user
            const initSFU = async () => {
              try {
                let iceServers: RTCIceServer[] = [];
                try {
                  const controller = new AbortController();
                  const timeoutId = setTimeout(() => controller.abort(), 3000);
                  const response = await fetch(`${import.meta.env.VITE_WS_URL || 'http://localhost:3001'}/api/turn-credentials`, { signal: controller.signal });
                  clearTimeout(timeoutId);
                  if (response.ok) {
                    const data = await response.json();
                    iceServers = [data];
                  }
                } catch (error) {
                  console.error('Failed to fetch ICE servers:', error);
                }

                if (sfuManagerRef.current) {
                  console.log('Initializing SFU for joined room:', roomData.id);
                  await sfuManagerRef.current.joinRoom(roomData.id, iceServers);
                  console.log('SFU initialized successfully');
                }
              } catch (err) {
                console.error('Failed to initialize SFU:', err);
                toast({
                  title: 'Media Error',
                  description: 'Failed to connect to media server. Audio/Video may not work.',
                  variant: 'destructive'
                });
              }
            };

            initSFU();

            if (onSuccess) onSuccess();
          } else if (response.error === 'waiting') {
            setState((prev) => ({ ...prev, isWaiting: true, error: null }));
            if (onSuccess) onSuccess();
          }
        }
      );
    },
    [user]
  );

  const createRoom = useCallback(
    (
      roomId: string,
      roomName: string,
      password?: string,
      accessType: 'public' | 'password' | 'invite' | 'organization' = 'public',
      onSuccess?: () => void,
      orgId?: string
    ) => {
      const userData = {
        id: user?.id,
        name: user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Guest',
      };

      const handleSuccess = (data: { roomId: string }) => {
        if (data.roomId === roomId) {
          joinRoom(roomId, password, undefined, onSuccess);
          signalingRef.current?.off('create-success' as keyof SignalingEvents, handleSuccess);
        }
      };
      signalingRef.current?.on('create-success' as keyof SignalingEvents, handleSuccess);

      signalingRef.current?.emit('create-room', {
        roomId,
        roomName,
        password,
        accessType,
        user: userData,
        orgId,
      });
    },
    [user, joinRoom]
  );


  const sendMessage = useCallback((content: string) => {
    if (state.roomId && user) {
      const messageData = {
        roomId: state.roomId,
        message: {
          content,
        },
      };
      signalingRef.current?.emit('send-message', messageData, (response: SocketResponse) => {
        if (!response.success) {
          toast({ title: 'Error', description: 'Failed to send message', variant: 'destructive' });
        }
      });
    }
  }, [state.roomId, user]);


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

          signalingRef.current?.emit('upload-file', { roomId: state.roomId!, file: fileData }, (response: SocketResponse) => {
            if (response.success) {
              resolve(true);
            } else {
              toast({ title: 'Upload Failed', description: response.error, variant: 'destructive' });
              resolve(false);
            }
          });
        }
      };
      reader.readAsDataURL(file);
    });
  }, [state.roomId, user]);

  const sendFile = uploadFile;

  const leaveRoom = useCallback(() => {
    if (state.roomId) {
      signalingRef.current?.emit('leave-room', { roomId: state.roomId });
      sfuManagerRef.current?.closeAll();
      setState((prev) => ({
        ...prev,
        roomId: null,
        roomName: null,
        users: [],
        messages: [],
        files: [],
        isHost: false,
        localStream: null,
        remoteStreams: new Map(),
      }));
      navigate('/dashboard');
    }
  }, [state.roomId, navigate]);

  const disbandRoom = useCallback(() => {
    if (state.roomId && state.isHost) {
      signalingRef.current?.emit('disband-room', { roomId: state.roomId });
    }
  }, [state.roomId, state.isHost]);

  const kickUser = useCallback((userId: string) => {
    if (state.roomId && state.isHost) {
      signalingRef.current?.emit('kick-user', { roomId: state.roomId, userId });
    }
  }, [state.roomId, state.isHost]);

  const updateRoomSettings = useCallback((roomName?: string, password?: string, hasWaitingRoom?: boolean, accessType?: 'public' | 'password' | 'invite') => {
    if (state.roomId && state.isHost) {
      const settings = { roomName, password, hasWaitingRoom, accessType };
      signalingRef.current?.emit('update-room-settings', { roomId: state.roomId, settings });
    }
  }, [state.roomId, state.isHost]);

  const admitUser = useCallback((userId: string) => {
    if (state.roomId && state.isHost) {
      signalingRef.current?.emit('admit-user', { roomId: state.roomId, userId });
    }
  }, [state.roomId, state.isHost]);

  const denyUser = useCallback((userId: string) => {
    if (state.roomId && state.isHost) {
      signalingRef.current?.emit('deny-user', { roomId: state.roomId, userId });
    }
  }, [state.roomId, state.isHost]);

  const admitAllWaitingUsers = useCallback(() => {
    if (state.roomId && state.isHost) {
      state.waitingUsers.forEach((user) => {
        signalingRef.current?.emit('admit-user', { roomId: state.roomId, userId: user.id });
      });
    }
  }, [state.roomId, state.isHost, state.waitingUsers]);

  const toggleRoomLock = useCallback(() => {
    if (state.roomId && state.isHost) {
      signalingRef.current?.emit('toggle-room-lock', { roomId: state.roomId });
    }
  }, [state.roomId, state.isHost]);

  const startYoutubeVideo = useCallback((videoId: string) => {
    if (state.roomId) {
      signalingRef.current?.emit('start-youtube', { roomId: state.roomId, videoId });
    }
  }, [state.roomId]);

  const stopYoutubeVideo = useCallback(() => {
    if (state.roomId) {
      signalingRef.current?.emit('close-youtube', { roomId: state.roomId });
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
      signalingRef.current?.emit('promote-to-cohost', { roomId: state.roomId, userId });
    }
  }, [state.roomId, state.isHost]);

  const demoteFromCoHost = useCallback((userId: string) => {
    if (state.roomId && state.isHost) {
      signalingRef.current?.emit('demote-from-cohost', { roomId: state.roomId, userId });
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

  const muteUser = useCallback((userId: string) => {
    if (state.roomId && state.isHost) {
      signalingRef.current?.emit('mute-user', { roomId: state.roomId, userId });
    }
  }, [state.roomId, state.isHost]);

  const getRecentRooms = useCallback((callback?: (rooms: unknown[]) => void) => {
    // Placeholder for getting recent rooms, maybe via API or socket
    console.log('getRecentRooms called');
    if (callback) callback([]);
  }, []);

  const closePresentedFile = useCallback(() => {
    if (state.roomId) {
      signalingRef.current?.emit('stop-presentation', { roomId: state.roomId });
      setState(prev => ({ ...prev, presentedFile: null, isPresentingFile: false, presenterName: null }));
    }
  }, [state.roomId]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const startBrowserSession = useCallback(() => {
    if (!state.roomId) return;
    signalingRef.current?.emit('sfu:startBrowser', { roomId: state.roomId }, (response: any) => {
      if (response.error) {
        toast({ title: 'Error', description: response.error, variant: 'destructive' });
      } else {
        toast({ title: 'Success', description: 'Cloud browser started' });
      }
    });
  }, [state.roomId]);

  const stopBrowserSession = useCallback(() => {
    if (!state.roomId) return;
    signalingRef.current?.emit('sfu:stopBrowser', { roomId: state.roomId }, (response: any) => {
      if (response.error) {
        toast({ title: 'Error', description: response.error, variant: 'destructive' });
      } else {
        toast({ title: 'Success', description: 'Cloud browser stopped' });
      }
    });
  }, [state.roomId]);

  const sendBrowserInput = useCallback((input: BrowserInput) => {
    if (!state.roomId) return;
    signalingRef.current?.emit('sfu:browserInput', { roomId: state.roomId, input });
  }, [state.roomId]);

  const value: WebSocketContextType = {
    ...state,
    socket: signalingRef.current?.rawSocket || null,
    signaling: signalingRef.current,
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
    closePresentedFile,
    clearError,
    enableMedia,
    presentFile: (file: FileData) => {
      if (state.roomId) {
        signalingRef.current?.emit('present-file', { roomId: state.roomId, file });
      }
    },
    toggleScreenShare: () => {
      if (state.isScreenSharing) {
        stopScreenShare();
      } else {
        startScreenShare();
      }
    },
    startBrowserSession,
    stopBrowserSession,
    sendBrowserInput,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};


