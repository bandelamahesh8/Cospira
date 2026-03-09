import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';
import { SignalingService } from '@/services/SignalingService';
import { SFUManager } from '@/services/SFUManager';
import { logger } from '@/utils/logger';
import { WebSocketState } from '@/contexts/WebSocketContextValue';
import {
  User,
  Message,
  FileData,
  RoomJoinedData,
  SfuNewProducerData,
  GameState,
  RoomInfo,
  TimerType,
  TimerAction,
} from '@/types/websocket';
import { RoomMode, getModeConfig, RoomModeConfig } from '@/services/RoomIntelligence';
import { getDesktopAdapter } from '@/adapters';

interface SocketIOError extends Error {
  type?: string;
  description?: string;
  context?: unknown;
}

interface UseSocketEventsProps {
  signalingRef: React.MutableRefObject<SignalingService | null>;
  sfuManagerRef: React.MutableRefObject<SFUManager | null>;
  state: WebSocketState;
  setState: React.Dispatch<React.SetStateAction<WebSocketState>>;
  navigate: ReturnType<typeof useNavigate>;
  signOut: () => Promise<void>;
  currentUserId: string | null;
  joinRoom: (roomId: string, password?: string, inviteToken?: string) => void;
  settings?: Record<string, unknown>; // Fallback
}

export const useSocketEvents = ({
  signalingRef,
  sfuManagerRef,
  state,
  setState,
  navigate,
  signOut,
  currentUserId,
  joinRoom,
}: UseSocketEventsProps) => {
  const stateRef = useRef(state);

  // Keep ref updated with the latest state
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const consumedProducers = useRef<Set<string>>(new Set());

  useEffect(() => {
    const signaling = signalingRef.current;
    const sfuManager = sfuManagerRef.current;
    if (!signaling || !sfuManager) return;

    const onConnect = () => {
      setState((prev) => ({ ...prev, isConnected: true, error: null }));
    };

    const onDisconnect = (reason: string) => {
      setState((prev) => ({
        ...prev,
        isConnected: false,
        roomId: null,
        roomName: null,
        users: [],
        error:
          reason === 'io server disconnect'
            ? 'Disconnected by server'
            : 'Connection lost. Reconnecting...',
      }));
      sfuManager.closeAll();
      consumedProducers.current.clear();
      logger.info('[useSocketEvents] Cleared consumed producers on disconnect');
    };

    const onConnectError = (error: SocketIOError) => {
      logger.error('Connection error:', {
        message: error.message,
        type: error.type,
        description: error.description,
        context: error.context,
      });
      setState((prev) => ({
        ...prev,
        isConnected: false,
        error: `Failed to connect to server: ${error.message}. Please check if the server is running and accessible.`,
      }));
    };

    const onReconnectAttempt = (attempt: number) => {
      setState((prev) => ({ ...prev, error: `Reconnecting... (Attempt ${attempt})` }));
    };

    const onReconnect = async () => {
      setState((prev) => ({ ...prev, isConnected: true, error: null }));
      toast({ title: 'Reconnected', description: 'Connection restored.' });
    };

    const onForceLogout = async (data: { reason?: string }) => {
      logger.info('[useSocketEvents] Force logout received:', data.reason);
      toast({
        title: 'Session Ended',
        description: data.reason || 'You have been logged out because another session was started.',
        variant: 'destructive',
      });

      if (signalingRef.current) {
        signalingRef.current.disconnect();
      }

      await signOut();
      navigate('/auth');
    };

    const onReconnectFailed = () => {
      setState((prev) => ({ ...prev, error: 'Reconnection failed. Please refresh.' }));
    };

    const onRoomJoined = async (data: RoomJoinedData) => {
      logger.info('[DEBUG] Room Joined Data Payload:', JSON.stringify(data, null, 2));
      setState((prev) => ({
        ...prev,
        roomId: data.roomId,
        roomName: data.name || data.roomId,
        organizationName: (typeof data.organizationName === 'string'
          ? data.organizationName
          : typeof data.settings?.organizationName === 'string'
            ? data.settings.organizationName
            : null) as string | null,
        users: data.users.map((u) => ({ ...u, joinedAt: u.joinedAt || new Date() })),
        messages: data.messages || [],
        files: data.files || [],
        isHost: data.isHost,
        hasWaitingRoom: data.hasWaitingRoom || false,
        waitingUsers: data.waitingUsers || [],
        isWaiting: false,
        accessType: data.accessType || 'public',
        inviteToken: data.inviteToken || null,
        youtubeVideoId: data.youtubeVideoId || null,
        isYoutubePlaying: data.youtubeStatus === 'playing',
        youtubeStatus: data.youtubeStatus || 'closed',
        youtubeCurrentTime:
          (data.youtubeCurrentTime || 0) +
          (data.youtubeStatus === 'playing' && data.youtubeLastActionTime
            ? (Date.now() - data.youtubeLastActionTime) / 1000
            : 0),
        presenterName: data.youtubePresenterName || null,
        gameState: data.gameState || {
          isActive: false,
          type: null,
          players: [],
          turn: null,
          board: null,
          winner: null,
          startGame: () => {},
        },
        error: null,
        roomStatus: data.status || 'live',
        roomMode: (data.settings?.mode || data.mode || data.roomMode || 'mixed') as RoomMode,
        roomModeConfig: getModeConfig(
          (data.settings?.mode || data.mode || data.roomMode || 'mixed') as RoomMode
        ),
        virtualBrowserUrl: data.virtualBrowserUrl || null,
        isVirtualBrowserActive: data.isVirtualBrowserActive || false,
        activeTimer: data.activeTimer || null,
        roomCreatedAt: data.createdAt || null,
      }));

      try {
        if (!signaling.connected) {
          let waitAttempts = 0;
          while (!signaling.connected && waitAttempts < 50) {
            await new Promise((resolve) => setTimeout(resolve, 100));
            waitAttempts++;
          }
        }

        let iceServers: RTCIceServer[] = [];
        try {
          const baseUrl = import.meta.env.VITE_WS_URL || 'http://localhost:3001';
          // Robust protocol handling: If we get an error on https, try http fallback for local dev
          const fetchWithFallback = async (url: string) => {
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 3000);
              const response = await fetch(url, { signal: controller.signal });
              clearTimeout(timeoutId);
              return response;
            } catch (e) {
              if (url.startsWith('https://')) {
                logger.warn(
                  `[TURN] fetch error on ${url}, trying http fallback. Original error:`,
                  e
                );
                try {
                  return await fetch(url.replace('https://', 'http://'));
                } catch (fallbackErr) {
                  logger.error('[TURN] Fallback http fetch also failed:', fallbackErr);
                  throw fallbackErr;
                }
              }
              throw e;
            }
          };

          const response = await fetchWithFallback(`${baseUrl}/api/turn-credentials`);
          if (response.ok) {
            const data = await response.json();
            iceServers = [data];
          }
        } catch (error) {
          logger.warn('Failed to fetch ICE servers:', error);
        }

        await sfuManager.joinRoom(data.roomId, iceServers);

        // Request existing producers to ensure we consume anyone already in the room
        await sfuManager.requestExistingProducers(data.roomId);

        // --- Reconnection Logic: Republish Local Streams ---
        // After re-joining, our transports are fresh (empty). We must re-produce our local tracks.
        const currentState = stateRef.current; // Access latest state via ref to avoid closure staleness

        if (currentState.localStream) {
          const audioTrack = currentState.localStream.getAudioTracks()[0];
          const videoTrack = currentState.localStream.getVideoTracks()[0];

          if (audioTrack && audioTrack.readyState === 'live') {
            logger.info('[Reconnection] Republishing audio track');
            // replaceTrack handles creating a new producer if it doesn't exist
            await sfuManager.replaceTrack(audioTrack, 'mic');
          }

          if (videoTrack && videoTrack.readyState === 'live') {
            logger.info('[Reconnection] Republishing video track');
            await sfuManager.replaceTrack(videoTrack, 'webcam');
          }
        }

        if (currentState.localScreenStream) {
          const screenTrack = currentState.localScreenStream.getVideoTracks()[0];
          if (screenTrack && screenTrack.readyState === 'live') {
            logger.info('[Reconnection] Republishing screen track');
            await sfuManager.replaceTrack(screenTrack, 'screen');
          }
        }
      } catch (err) {
        logger.error('Failed to join SFU room:', err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        toast({
          title: 'Connection Error',
          description: `Failed to connect to media server: ${errorMessage}. Please try refreshing the page.`,
          variant: 'destructive',
        });
      }
    };

    const onWaitingUserJoined = (user: User) => {
      let isNewWaiter = false;
      setState((prev) => {
        const exists = prev.waitingUsers.some((u) => u.id === user.id);
        isNewWaiter = !exists;
        return {
          ...prev,
          waitingUsers: exists ? prev.waitingUsers : [...prev.waitingUsers, user],
        };
      });

      const currentState = stateRef.current;
      const currentUser = currentState.users.find((u) => u.id === currentUserId);
      const canManage = currentState.isHost || currentUser?.isCoHost;

      if (isNewWaiter && canManage) {
        sonnerToast(`New Entry Request`, {
          description: `${user.name} is waiting in the secure lobby.`,
          duration: 10000,
          action: {
            label: 'Admit',
            onClick: () =>
              signalingRef.current?.emit('admit-user', {
                roomId: currentState.roomId,
                userId: user.id,
              }),
          },
          cancel: {
            label: 'Deny',
            onClick: () =>
              signalingRef.current?.emit('deny-user', {
                roomId: currentState.roomId,
                userId: user.id,
              }),
          },
          style: {
            background: 'rgba(20, 20, 25, 0.95)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            backdropFilter: 'blur(12px)',
            color: 'white',
          },
        });
      }
    };

    const onWaitingUserRemoved = (userId: string) => {
      setState((prev) => ({
        ...prev,
        waitingUsers: prev.waitingUsers.filter((u) => u.id !== userId),
      }));
    };

    const onJoinDenied = () => {
      setState((prev) => ({
        ...prev,
        error: 'Host denied your request to join.',
        isWaiting: false,
      }));
      toast({
        title: 'Access Denied',
        description: 'The host denied your request to join.',
        variant: 'destructive',
      });
      navigate('/dashboard');
    };

    const onUserJoined = (newUser: User) => {
      let isNew = false;
      setState((prev) => {
        const userExists = prev.users.some((u) => u.id === newUser.id);
        isNew = !userExists;

        if (userExists) return prev;

        const nextUsers = [...prev.users, { ...newUser, joinedAt: newUser.joinedAt || new Date() }];
        const nextMessages = [
          ...prev.messages,
          {
            id: `system-${Date.now()}`,
            userId: 'system',
            userName: 'System',
            content: `${newUser.name} joined the room`,
            timestamp: new Date(),
          },
        ];

        return { ...prev, users: nextUsers, messages: nextMessages };
      });

      if (isNew) {
        // toast({ title: 'User Joined', description: `${newUser.name} joined.` });
        getDesktopAdapter().showNotification('User Joined', `${newUser.name} joined the room.`);
      }
    };

    const onUserLeft = (userId: string) => {
      setState((prev) => {
        const leavingUser = prev.users.find((u) => u.id === userId);
        const systemMessage: Message = {
          id: `system-${Date.now()}`,
          userId: 'system',
          userName: 'System',
          content: `${leavingUser?.name || 'A user'} left the room`,
          timestamp: new Date(),
        };
        const newRemoteStreams = new Map(prev.remoteStreams);
        newRemoteStreams.delete(userId);
        return {
          ...prev,
          users: prev.users.filter((u) => u.id !== userId),
          messages: [...prev.messages, systemMessage],
          remoteStreams: newRemoteStreams,
        };
      });

      const leavingUser = stateRef.current.users.find((u) => u.id === userId);
      if (leavingUser) {
        getDesktopAdapter().showNotification('User Left', `${leavingUser.name} left the room.`);
      }
    };

    const onSfuNewProducer = async ({ producerId, socketId, userId, kind }: SfuNewProducerData) => {
      const currentState = stateRef.current;
      if (!currentState.roomId) return;
      if (socketId && signaling.id && socketId === signaling.id) return;
      if (consumedProducers.current.has(producerId)) return;
      consumedProducers.current.add(producerId);

      const tryConsume = async (attempt = 1, maxAttempts = 5) => {
        try {
          const maxWait = 15000;
          const startTime = Date.now();
          while (!sfuManager.isRecvTransportReady() && Date.now() - startTime < maxWait) {
            await new Promise((resolve) => setTimeout(resolve, 200));
          }

          if (!sfuManager.isRecvTransportReady()) {
            if (attempt < maxAttempts) {
              const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
              setTimeout(() => tryConsume(attempt + 1, maxAttempts), delay);
              return;
            } else {
              consumedProducers.current.delete(producerId);
              return;
            }
          }

          const userIdForStream = userId || socketId;
          await sfuManager.consume(currentState.roomId!, producerId, userIdForStream, kind);
        } catch (_err) {
          if (attempt < maxAttempts) {
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
            setTimeout(() => tryConsume(attempt + 1, maxAttempts), delay);
          } else {
            consumedProducers.current.delete(producerId);
          }
        }
      };
      tryConsume();
    };

    const onNewMessage = (message: Message) => {
      setState((prev) => {
        // Deduplicate: If this matches a pending (optimistic) message from us
        if (message.userId === currentUserId) {
          const exists = prev.messages.some(
            (m) => m.id === message.id || (m.pending && m.content === message.content)
          );
          if (exists) {
            // Replace the pending message with the official server version
            const filtered = prev.messages.filter(
              (m) => m.id !== message.id && (!m.pending || m.content !== message.content)
            );
            return { ...prev, messages: [...filtered, message] };
          }
        }
        return { ...prev, messages: [...prev.messages, message] };
      });

      if (message.userId !== currentUserId && message.userId !== 'system') {
        getDesktopAdapter().showNotification(
          'New Message',
          `${message.userName}: ${message.content}`
        );
      }
    };

    const onNewFile = (file: FileData) => {
      setState((prev) => ({ ...prev, files: [...prev.files, file] }));
      getDesktopAdapter().showNotification('New File', `Shared: ${file.name}`);
    };

    const onUserStatusChange = (data: { userId: string; status: 'online' | 'away' }) => {
      setState((prev) => ({
        ...prev,
        users: prev.users.map((u) =>
          u.id === data.userId ? { ...u, status: data.status, isAway: data.status === 'away' } : u
        ),
      }));
    };

    const onUserAudioChange = (data: { userId: string; enabled: boolean }) => {
      setState((prev) => ({
        ...prev,
        users: prev.users.map((u) => (u.id === data.userId ? { ...u, isMuted: !data.enabled } : u)),
      }));
    };

    const onUserVideoChange = (data: { userId: string; enabled: boolean }) => {
      setState((prev) => ({
        ...prev,
        users: prev.users.map((u) =>
          u.id === data.userId ? { ...u, isVideoOn: data.enabled } : u
        ),
      }));
    };

    const onLobbyApproved = (data: { roomId: string }) => {
      setState((prev) => ({ ...prev, isWaiting: false }));
      joinRoom(data.roomId);
      toast({ title: 'Access Approved', description: 'You have been admitted to the room.' });
    };

    const onUserMediaStateChange = (data: { userId: string; audio?: boolean; video?: boolean }) => {
      const dataUserId = String(data.userId);
      setState((prev) => ({
        ...prev,
        users: prev.users.map((u) => {
          if (String(u.id) !== dataUserId) return u;
          const nextUser = { ...u };
          if (data.audio !== undefined) nextUser.isMuted = !data.audio;
          if (data.video !== undefined) nextUser.isVideoOn = data.video;
          return nextUser;
        }),
      }));
    };

    const onRoomDisbanded = () => {
      toast({
        title: 'Room Disbanded',
        description: 'Host disbanded the room.',
        variant: 'destructive',
      });
      sfuManager.closeAll();
      consumedProducers.current.clear();
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
        roomCreatedAt: null,
      }));
      navigate('/dashboard');
    };

    const onKicked = () => {
      toast({
        title: 'Kicked',
        description: 'You were kicked by the host.',
        variant: 'destructive',
      });
      sfuManager.closeAll();
      signaling.disconnect();
      navigate('/');
    };

    const onRoomSettingsUpdated = (data: {
      roomName?: string;
      hasWaitingRoom?: boolean;
      accessType?: 'public' | 'password' | 'invite' | 'organization';
      inviteToken?: string | null;
    }) => {
      setState((prev) => ({
        ...prev,
        roomName: data.roomName !== undefined ? data.roomName : prev.roomName,
        hasWaitingRoom:
          data.hasWaitingRoom !== undefined ? data.hasWaitingRoom : prev.hasWaitingRoom,
        accessType: data.accessType || prev.accessType,
        inviteToken: data.inviteToken !== undefined ? data.inviteToken : prev.inviteToken,
      }));
      toast({ title: 'Settings Updated', description: 'Room settings updated.' });
    };

    const onRoomSettingsUpdateSuccess = () => {
      toast({ title: 'Success', description: 'Room settings saved.' });
    };

    const onRoomLockToggled = (data: { isLocked: boolean }) => {
      setState((prev) => ({ ...prev, isRoomLocked: data.isLocked }));
      toast({
        title: data.isLocked ? 'Room Locked' : 'Room Unlocked',
        description: data.isLocked ? 'New participants cannot join.' : 'Room is open.',
      });
    };

    const onUserStartedScreenShare = (data: { userId: string; streamId: string }) => {
      logger.info(`[Socket] User ${data.userId} started screen share`, data.streamId);
      // This is handled by SFU events mainly, but we can track it in state if needed
    };

    const onUserStoppedScreenShare = (data: { userId: string }) => {
      logger.info(`[Socket] User ${data.userId} stopped screen share`);
      setState((prev) => {
        const newRemoteStreams = new Map(prev.remoteStreams);
        // Find and remove screen stream for this user
        for (const [id] of newRemoteStreams.entries()) {
          if (id.startsWith(`${data.userId}-screen`)) {
            newRemoteStreams.delete(id);
          }
        }
        return { ...prev, remoteStreams: newRemoteStreams };
      });
    };

    const onYoutubeStarted = ({
      videoId,
      presenterName,
    }: {
      videoId: string;
      presenterName: string;
    }) => {
      setState((prev) => ({
        ...prev,
        youtubeVideoId: videoId,
        isYoutubePlaying: true,
        youtubeStatus: 'playing',
        youtubeCurrentTime: 0,
        presenterName,
      }));
      toast({
        title: 'YouTube Started',
        description: `${presenterName || 'Someone'} started a video.`,
      });
    };

    const onYoutubeClosed = () => {
      setState((prev) => ({
        ...prev,
        youtubeVideoId: null,
        isYoutubePlaying: false,
        youtubeStatus: 'closed',
        youtubeCurrentTime: 0,
        presenterName: null,
      }));
    };

    const onUserPromoted = (userId: string) => {
      setState((prev) => ({
        ...prev,
        users: prev.users.map((u) => (u.id === userId ? { ...u, isCoHost: true } : u)),
      }));
      toast({ title: 'User Promoted', description: 'A user promoted to co-host.' });
    };

    const onUserDemoted = (userId: string) => {
      setState((prev) => ({
        ...prev,
        users: prev.users.map((u) => (u.id === userId ? { ...u, isCoHost: false } : u)),
      }));
      toast({ title: 'User Demoted', description: 'A user demoted from co-host.' });
    };

    const onYoutubePlayed = ({ time }: { time: number }) => {
      setState((prev) => ({
        ...prev,
        isYoutubePlaying: true,
        youtubeStatus: 'playing',
        youtubeCurrentTime: time,
      }));
    };

    const onYoutubePaused = ({ time }: { time: number }) => {
      setState((prev) => ({
        ...prev,
        isYoutubePlaying: false,
        youtubeStatus: 'paused',
        youtubeCurrentTime: time,
      }));
    };

    const onYoutubeSeeked = ({ time }: { time: number }) => {
      setState((prev) => ({ ...prev, youtubeCurrentTime: time }));
    };

    const onFilePresented = ({
      fileData,
      presenterName,
    }: {
      fileData: FileData;
      presenterName: string;
    }) => {
      if (!fileData) return;
      setState((prev) => ({
        ...prev,
        presentedFile: fileData,
        isPresentingFile: true,
        presenterName: presenterName || fileData.userName || 'Unknown',
      }));
      toast({
        title: 'File Presented',
        description: `${presenterName || 'Someone'} is presenting.`,
      });
    };

    const onPresentationClosed = () => {
      setState((prev) => ({
        ...prev,
        presentedFile: null,
        isPresentingFile: false,
        presenterName: null,
      }));
    };

    const onBrowserStarted = ({ url }: { url: string }) => {
      setState((prev) => ({ ...prev, virtualBrowserUrl: url, isVirtualBrowserActive: true }));
      toast({ title: 'Virtual Browser Started' });
    };

    const onBrowserUrlUpdated = ({ url }: { url: string }) => {
      setState((prev) => ({ ...prev, virtualBrowserUrl: url }));
    };

    const onBrowserClosed = () => {
      setState((prev) => ({ ...prev, virtualBrowserUrl: null, isVirtualBrowserActive: false }));
      toast({ title: 'Virtual Browser Closed' });
    };

    const onGameStarted = (gameState: GameState) => {
      setState((prev) => ({ ...prev, gameState }));
    };

    const onGameMove = (gameState: GameState) => {
      setState((prev) => ({ ...prev, gameState }));
    };

    const onGameStrike = ({ player, strikes }: { player: string; strikes: number }) => {
      setState((prev) => {
        const updatedPlayers = prev.gameState?.players.map((p) =>
          p.id === player ? { ...p, strikes } : p
        );
        return {
          ...prev,
          gameState: prev.gameState
            ? { ...prev.gameState, players: updatedPlayers }
            : prev.gameState,
        };
      });
      toast({ title: "Time's Up!", description: `Strike ${strikes}/3!`, variant: 'destructive' });
    };

    const onGameEnded = (gameState: GameState) => {
      setState((prev) => ({ ...prev, gameState }));
      if (gameState.winner) {
        const winnerName =
          gameState.players.find((p) => p.id === gameState.winner)?.name || 'Unknown';
        toast({
          title: 'Game Over',
          description: gameState.winner === 'draw' ? 'Draw!' : `${winnerName} won!`,
        });
      }
    };

    const onSystemAnnouncement = (data: {
      type: 'success' | 'warning' | 'danger' | 'info';
      message: string;
    }) => {
      toast({
        title: data.type === 'danger' ? 'ALERT' : 'System Announcement',
        description: data.message,
        variant: data.type === 'danger' ? 'destructive' : 'default',
      });
    };

    const onAdminForceSync = () => {
      toast({ title: 'System Sync', description: 'Reloading...' });
      setTimeout(() => window.location.reload(), 1500);
    };

    const onForceDisconnect = (data: { reason: string }) => {
      toast({ title: 'Terminated', description: data.reason, variant: 'destructive' });
    };

    const onTranscript = (data: {
      userId: string;
      text: string;
      timestamp: number;
      isFinal: boolean;
    }) => {
      setState((prev) => {
        const user = prev.users.find((u) => u.id === data.userId);
        return {
          ...prev,
          lastTranscript: {
            ...data,
            id: crypto.randomUUID(),
            userName: user?.name || 'Unknown',
            timestamp: new Date(data.timestamp),
          },
        };
      });
    };

    const onRoomModeUpdated = (data: { mode: string; config?: RoomModeConfig }) => {
      setState((prev) => ({
        ...prev,
        roomMode: data.mode as RoomMode,
        roomModeConfig: getModeConfig(data.mode as RoomMode),
      }));
    };

    const onAssistantResponse = (data: { content: string; type: string; action?: string }) => {
      if (data.type === 'text') {
        const aiMessage: Message = {
          id: `ai-${Date.now()}`,
          userId: 'assistant',
          userName: 'Cospira AI',
          content: data.content,
          timestamp: new Date(),
        };
        setState((prev) => ({ ...prev, messages: [...prev.messages, aiMessage] }));
      }
    };

    const onTimerStarted = (data: {
      duration: number;
      startedAt: number;
      label: string;
      type?: TimerType;
      action?: TimerAction;
    }) => {
      setState((prev) => ({ ...prev, activeTimer: data }));

      // Voice notification
      if ('speechSynthesis' in window) {
        const utterance = new window.SpeechSynthesisUtterance(
          `${data.label || 'Session'} timer started for ${data.duration} minutes.`
        );
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
      }

      toast({
        title: 'Timer Started',
        description: `Timer for ${data.duration} mins: ${data.label}`,
      });
    };

    const onPollCreated = (data: {
      id: string;
      question: string;
      options: string[];
      expiresAt: number;
    }) => {
      setState((prev) => ({ ...prev, activePoll: { ...data, totalVotes: 0 } }));
      toast({ title: 'New Poll', description: `AI created a poll: ${data.question}` });
    };

    const onLateJoinSummary = (data: { summary: string; bullets: string[]; duration: number }) => {
      setState((prev) => ({ ...prev, lateJoinSummary: data }));
    };

    const onModerationAlert = (data: { severity: string; action: string; reason: string }) => {
      toast({ title: 'Security Alert', description: data.reason, variant: 'destructive' });
    };

    const onBrowserCommandResult = (data: {
      command: string;
      action: unknown;
      result: { success: boolean; message?: string };
    }) => {
      if (data.result.success) {
        toast({ title: 'Assistant Action', description: `Executed: ${data.command}` });
      } else {
        toast({
          title: 'Assistant Failed',
          description: data.result.message || `Failed: ${data.command}`,
          variant: 'destructive',
        });
      }
    };

    signaling.on('connect', onConnect);
    signaling.on('disconnect', onDisconnect);
    signaling.on('force_logout', onForceLogout);
    signaling.on('connect_error', onConnectError);
    signaling.on('reconnect_attempt', onReconnectAttempt);
    signaling.on('reconnect', onReconnect);
    signaling.on('reconnect_failed', onReconnectFailed);
    signaling.on('room-joined', onRoomJoined);
    signaling.on('waiting-user-joined', onWaitingUserJoined);
    signaling.on('waiting-user-removed', onWaitingUserRemoved);
    signaling.on('lobby:approved', onLobbyApproved);
    signaling.on('join-denied', onJoinDenied);
    signaling.on('user-joined', onUserJoined);
    signaling.on('user-left', onUserLeft);
    signaling.on('sfu:newProducer', onSfuNewProducer);
    signaling.on('new-message', onNewMessage);
    signaling.on('new-file', onNewFile);
    signaling.on('room-disbanded', onRoomDisbanded);
    signaling.on('kicked', onKicked);
    signaling.on('room-settings-updated', onRoomSettingsUpdated);
    signaling.on('room-settings-update-success', onRoomSettingsUpdateSuccess);
    signaling.on('room-lock-toggled', onRoomLockToggled);
    signaling.on('user-started-screen-share', onUserStartedScreenShare);
    signaling.on('user-stopped-screen-share', onUserStoppedScreenShare);
    signaling.on('youtube-started', onYoutubeStarted);
    signaling.on('youtube-closed', onYoutubeClosed);
    signaling.on('youtube-played', onYoutubePlayed);
    signaling.on('youtube-paused', onYoutubePaused);
    signaling.on('youtube-seeked', onYoutubeSeeked);
    signaling.on('user-promoted', onUserPromoted);
    signaling.on('user-demoted', onUserDemoted);
    signaling.on('file-presented', onFilePresented);
    signaling.on('presentation-closed', onPresentationClosed);
    signaling.on('game-started', onGameStarted);
    signaling.on('game-move', onGameMove);
    signaling.on('game-strike', onGameStrike);
    signaling.on('game-ended', onGameEnded);
    signaling.on('browser-started', onBrowserStarted);
    signaling.on('browser-url-updated', onBrowserUrlUpdated);
    signaling.on('browser-closed', onBrowserClosed);
    signaling.on('system:announcement', onSystemAnnouncement);
    signaling.on('admin:force-sync', onAdminForceSync);
    signaling.on('force-disconnect', onForceDisconnect);
    signaling.on('ai:transcript', onTranscript);
    signaling.on('assistant:response', onAssistantResponse);
    signaling.on('room:timer-started', onTimerStarted);
    signaling.on('room:poll-created', onPollCreated);
    signaling.on('late-join-summary', onLateJoinSummary);
    signaling.on('moderation:alert', onModerationAlert);
    signaling.on('room:mode-changed', onRoomModeUpdated);
    signaling.on('browser-command-result', onBrowserCommandResult);
    signaling.on('user:status-change', onUserStatusChange);
    signaling.on('user:audio-change', onUserAudioChange);
    signaling.on('user:video-change', onUserVideoChange);
    signaling.on('user:media-state', onUserMediaStateChange);

    signaling.on('update-rooms', (rooms: RoomInfo[]) => {
      setState((prev) => ({ ...prev, recentRooms: rooms }));
    });

    return () => {
      signaling.off('connect', onConnect);
      signaling.off('disconnect', onDisconnect);
      signaling.off('force_logout', onForceLogout);
      signaling.off('connect_error', onConnectError);
      signaling.off('reconnect_attempt', onReconnectAttempt);
      signaling.off('reconnect', onReconnect);
      signaling.off('reconnect_failed', onReconnectFailed);
      signaling.off('room-joined', onRoomJoined);
      signaling.off('waiting-user-joined', onWaitingUserJoined);
      signaling.off('waiting-user-removed', onWaitingUserRemoved);
      signaling.off('lobby:approved', onLobbyApproved);
      signaling.off('join-denied', onJoinDenied);
      signaling.off('user-joined', onUserJoined);
      signaling.off('user-left', onUserLeft);
      signaling.off('sfu:newProducer', onSfuNewProducer);
      signaling.off('new-message', onNewMessage);
      signaling.off('new-file', onNewFile);
      signaling.off('room-disbanded', onRoomDisbanded);
      signaling.off('kicked', onKicked);
      signaling.off('room-settings-updated', onRoomSettingsUpdated);
      signaling.off('room-settings-update-success', onRoomSettingsUpdateSuccess);
      signaling.off('room-lock-toggled', onRoomLockToggled);
      signaling.off('youtube-started', onYoutubeStarted);
      signaling.off('youtube-closed', onYoutubeClosed);
      signaling.off('youtube-played', onYoutubePlayed);
      signaling.off('youtube-paused', onYoutubePaused);
      signaling.off('youtube-seeked', onYoutubeSeeked);
      signaling.off('user-promoted', onUserPromoted);
      signaling.off('user-demoted', onUserDemoted);
      signaling.off('file-presented', onFilePresented);
      signaling.off('presentation-closed', onPresentationClosed);
      signaling.off('game-started', onGameStarted);
      signaling.off('game-move', onGameMove);
      signaling.off('game-strike', onGameStrike);
      signaling.off('game-ended', onGameEnded);
      signaling.off('browser-started', onBrowserStarted);
      signaling.off('browser-url-updated', onBrowserUrlUpdated);
      signaling.off('browser-closed', onBrowserClosed);
      signaling.off('system:announcement', onSystemAnnouncement);
      signaling.off('admin:force-sync', onAdminForceSync);
      signaling.off('force-disconnect', onForceDisconnect);
      signaling.off('ai:transcript', onTranscript);
      signaling.off('assistant:response', onAssistantResponse);
      signaling.off('room:timer-started', onTimerStarted);
      signaling.off('room:poll-created', onPollCreated);
      signaling.off('late-join-summary', onLateJoinSummary);
      signaling.off('moderation:alert', onModerationAlert);
      signaling.off('room:mode-changed', onRoomModeUpdated);
      signaling.off('user:status-change', onUserStatusChange);
      signaling.off('user:audio-change', onUserAudioChange);
      signaling.off('user:video-change', onUserVideoChange);
      signaling.off('user:media-state', onUserMediaStateChange);
    };
  }, [navigate, signalingRef, sfuManagerRef, setState, signOut, currentUserId, joinRoom]);
};
