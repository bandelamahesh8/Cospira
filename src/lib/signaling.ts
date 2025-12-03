import { io, Socket } from 'socket.io-client';
import { User, Message, FileData, RoomJoinedData } from '@/types/websocket';

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
  'file-presented': (data: FileData) => void;
  'presentation-closed': () => void;
  'youtube-started': (data: { videoId: string; presenterName: string }) => void;
  'youtube-closed': () => void;
  'youtube-played': (data: { time: number }) => void;
  'youtube-paused': (data: { time: number }) => void;
  'youtube-seeked': (data: { time: number }) => void;
  'room-settings-updated': (data: { roomName?: string; hasWaitingRoom?: boolean; accessType?: 'public' | 'password' | 'invite' | 'organization'; inviteToken?: string | null }) => void;
  'room-settings-update-success': () => void;
  error: (error: string) => void;
  connect: () => void;
  disconnect: (reason: string) => void;
  connect_error: (error: Error) => void;
  reconnect_attempt: (attempt: number) => void;
  reconnect: (attempt: number) => void;
  reconnect_failed: () => void;
  'waiting-user-joined': (user: User) => void;
  'waiting-user-removed': (userId: string) => void;
  'join-denied': () => void;
  'sfu:newProducer': (data: { producerId: string; socketId: string; kind: string }) => void;
  'create-success': (data: { roomId: string }) => void;
  'recent-rooms': (rooms: unknown[]) => void;
  'room-created': () => void;
  'room-removed': () => void;
};

export class SignalingService {
  private socket: Socket | null = null;
  private listeners: Map<string, ((...args: unknown[]) => void)[]> = new Map();

  constructor(private url: string) { }

  private dispatch(event: string, ...args: unknown[]) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((handler) => handler(...args));
    }
  }

  connect() {
    if (this.socket) return;

    console.log('SignalingService: Connecting to', this.url);
    // Convert ws:// to http:// for Socket.IO (it uses HTTP for connection, then upgrades)
    const socketUrl = this.url.replace(/^ws:/, 'http:');
    this.socket = io(socketUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.5,
      auth: {
        token: localStorage.getItem('token'),
      },
    });

    this.socket.onAny((event, ...args) => {
      this.dispatch(event, ...args);
    });

    this.socket.on('connect', () => {
      console.log('SignalingService: Connected', this.socket?.id);
      this.dispatch('connect');
    });

    this.socket.on('connect_error', (err) => {
      console.error('SignalingService: Connection error', err);
      this.dispatch('error', err.message);
    });
  }

  disconnect() {
    if (this.socket) {
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

  emit(event: string, data?: unknown, callback?: (...args: unknown[]) => void) {
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
}
