import { io, Socket } from 'socket.io-client';
import {
  User,
  Message,
  FileData,
  RoomJoinedData,
  GameState,
  RoomStatus,
  RoomInfo,
  PollData,
} from '@/types/websocket';
import { logger } from '@/utils/logger';
import { RoomModeConfig } from '@/services/RoomIntelligence';

declare global {
  interface Window {
    __cospiraSignaling?: Socket | null;
  }
}

export type SignalingEvents = {
  'room-joined': (data: RoomJoinedData) => void;
  'room-left': () => void;
  'room-disbanded': () => void;
  'new-message': (message: Message) => void;
  'new-file': (file: FileData) => void;
  'user-joined': (user: User) => void;
  'user-left': (userId: string) => void;
  offer: (payload: unknown) => void;
  answer: (payload: unknown) => void;
  'ice-candidate': (payload: unknown) => void;
  'user-promoted': (userId: string) => void;
  'user-demoted': (userId: string) => void;
  kicked: () => void;
  'muted-by-host': () => void;
  'room-lock-toggled': (data: { isLocked: boolean }) => void;
  'user-started-screen-share': (data: { userId: string; streamId: string }) => void;
  'user-stopped-screen-share': (data: { userId: string }) => void;
  'file-presented': (data: { fileData: FileData; presenterName: string }) => void;
  'presentation-closed': () => void;
  'youtube-started': (data: { videoId: string; presenterName: string }) => void;
  'youtube-closed': () => void;
  'youtube-played': (data: { time: number }) => void;
  'youtube-paused': (data: { time: number }) => void;
  'youtube-seeked': (data: { time: number }) => void;
  'room-settings-updated': (data: {
    roomName?: string;
    hasWaitingRoom?: boolean;
    accessType?: 'public' | 'password' | 'invite' | 'organization';
    inviteToken?: string | null;
  }) => void;
  'room-settings-update-success': () => void;
  error: (error: string) => void;
  connect: () => void;
  disconnect: (reason: string) => void;
  connect_error: (
    error: Error & { type?: string; description?: string; context?: unknown }
  ) => void;
  reconnect_attempt: (attempt: number) => void;
  reconnect: (attempt: number) => void;
  reconnect_failed: () => void;
  'waiting-user-joined': (user: User) => void;
  'waiting-user-removed': (userId: string) => void;
  'join-denied': () => void;
  'sfu:newProducer': (data: {
    producerId: string;
    socketId: string;
    userId: string;
    kind: string;
  }) => void;
  'create-success': (data: { roomId: string }) => void;
  'recent-rooms': (rooms: unknown[]) => void;
  'room-created': () => void;
  'room-removed': () => void;
  'game-started': (gameState: GameState) => void;
  'game-move': (gameState: GameState) => void;
  'game-strike': (data: { player: string; strikes: number; gameState: GameState }) => void;
  'game-ended': (gameState: GameState) => void;
  force_logout: (data: { reason?: string }) => void;
  'browser-started': (data: { url: string }) => void;
  'browser-url-updated': (data: { url: string }) => void;
  'browser-closed': () => void;
  'system:announcement': (data: {
    type: 'success' | 'warning' | 'danger' | 'info';
    message: string;
  }) => void;
  'admin:force-sync': () => void;
  'force-disconnect': (data: { reason: string }) => void;
  'user:status-change': (data: { userId: string; status: 'online' | 'away' }) => void;
  'user:audio-change': (data: { userId: string; enabled: boolean }) => void;
  'user:video-change': (data: { userId: string; enabled: boolean }) => void;
  'user:media-state': (data: { userId: string; audio?: boolean; video?: boolean }) => void;
  'ai:transcript': (data: {
    userId: string;
    text: string;
    timestamp: number;
    isFinal: boolean;
  }) => void;
  'assistant:response': (data: { content: string; type: string; action?: string }) => void;
  'room:timer-started': (data: { duration: number; startedAt: number; label: string }) => void;
  'room:timer-paused': () => void;
  'room:timer-stopped': () => void;
  'room:timer-ended': () => void;
  'room:poll-created': (data: PollData) => void;
  'room:poll-updated': (data: PollData) => void;
  'late-join-summary': (data: { summary: string; bullets: string[]; duration: number }) => void;
  'moderation:alert': (data: { severity: string; action: string; reason: string }) => void;
  'summary-generated': (data: unknown) => void;
  'room:mode-changed': (data: { mode: string; config: RoomModeConfig }) => void;
  'browser-command-result': (data: {
    command: string;
    action: unknown;
    result: { success: boolean; message?: string };
  }) => void;
  'update-rooms': (rooms: RoomInfo[]) => void;
  'global-chat-message': (data: { sender: string; content: string; timestamp: string }) => void;
  'lobby:approved': (data: { roomId: string }) => void;
  'room:status-changed': (status: RoomStatus) => void;
  'present-file': (data: { file: FileData; presenterName: string }) => void;
  'stop-presentation': () => void;
  'youtube-state': (data: {
    videoId: string | null;
    status: 'playing' | 'paused' | 'closed';
    currentTime: number;
    presenterName: string | null;
  }) => void;
};

export class SignalingService {
  private socket: Socket | null = null;
  private listeners: Map<string, ((...args: unknown[]) => void)[]> = new Map();

  constructor(private url: string) {}

  private dispatch(event: string, ...args: unknown[]) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((handler) => handler(...args));
    }
  }

  connect(token?: string) {
    if (this.socket) return;

    logger.info('SignalingService: Connecting to', this.url);
    // Convert ws:// to http:// and wss:// to https:// for Socket.IO
    let socketUrl = this.url.replace(/^ws:/, 'http:').replace(/^wss:/, 'https:');

    // Ensure we have a proper URL (add http:// if missing)
    if (!socketUrl.startsWith('http://') && !socketUrl.startsWith('https://')) {
      socketUrl = `http://${socketUrl}`;
    }

    // Remove trailing slash
    socketUrl = socketUrl.replace(/\/$/, '');

    logger.debug('SignalingService: Normalized URL:', socketUrl);

    // Verify server is reachable before attempting connection (non-blocking)
    this.verifyServerReachability(socketUrl).catch((err) => {
      logger.warn('Server reachability check failed (will attempt connection anyway):', err);
    });

    this.socket = io(socketUrl, {
      path: '/socket.io',
      transports: ['polling', 'websocket'], // Start with polling for better tunnel stability, upgrade after handshake
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.5,
      timeout: 20000, // 20 second connection timeout
      withCredentials: true,
      auth: {
        token: token || localStorage.getItem('token'),
      },
    });

    this.socket.onAny((event, ...args) => {
      this.dispatch(event, ...args);
    });

    this.socket.on('connect', () => {
      logger.info(
        'SignalingService: Connected',
        this.socket?.id,
        'Transport:',
        this.socket?.io?.engine?.transport?.name
      );

      // Expose to window for BreakoutContext AI insight bindings
      window.__cospiraSignaling = this.socket;

      this.dispatch('connect');
    });

    this.socket.on(
      'connect_error',
      (err: Error & { type?: string; description?: string; context?: unknown }) => {
        logger.error('SignalingService: Connection error', {
          message: err.message,
          type: err.type,
          description: err.description,
          context: err.context,
          url: socketUrl,
        });
        this.dispatch('connect_error', err);
      }
    );

    this.socket.on('disconnect', (reason) => {
      logger.warn('SignalingService: Disconnected', reason);
      if (window.__cospiraSignaling === this.socket) {
        delete window.__cospiraSignaling;
      }
      this.dispatch('disconnect', reason);
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      logger.info('SignalingService: Reconnection attempt', attemptNumber);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      logger.info('SignalingService: Reconnected after', attemptNumber, 'attempts');
    });

    this.socket.on('reconnect_failed', () => {
      logger.error('SignalingService: Reconnection failed');
    });
  }

  disconnect() {
    if (this.socket) {
      if (window.__cospiraSignaling === this.socket) {
        delete window.__cospiraSignaling;
      }
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on<K extends keyof SignalingEvents>(event: K, handler: SignalingEvents[K]) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(handler as (...args: unknown[]) => void);
  }

  off<K extends keyof SignalingEvents>(event: K, handler: SignalingEvents[K]) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      this.listeners.set(
        event,
        handlers.filter((h) => h !== handler)
      );
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  emit(event: string, data?: unknown, callback?: (...args: any[]) => void) {
    if (this.socket) {
      this.socket.emit(event, data, callback);
    }
  }

  get id() {
    return this.socket?.id;
  }

  get connected() {
    return this.socket?.connected || false;
  }

  get rawSocket() {
    return this.socket;
  }

  private async verifyServerReachability(url: string): Promise<void> {
    try {
      const healthUrl = `${url}/health`;
      const response = await fetch(healthUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(3000), // 3 second timeout
      });
      if (response.ok) {
        logger.debug('Server health check passed');
      } else {
        logger.warn('Server health check returned non-OK status:', response.status);
      }
    } catch (error) {
      // Silently fail - connection attempt will handle it
      logger.warn('Server health check failed (server may not be running):', error);
    }
  }
}
