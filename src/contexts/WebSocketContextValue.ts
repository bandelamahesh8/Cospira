import { createContext } from 'react';
import { type Socket } from 'socket.io-client';
import { User, Message, FileData, GameState, TimerData, PollData, LateJoinSummaryData, RoomStatus, RoomInfo, TranscriptData, MeetingSummary } from '@/types/websocket';
import { SignalingService } from '@/services/SignalingService';
import { RoomMode, RoomModeConfig, RoomSuggestion } from '@/services/RoomIntelligence';

export { type TranscriptData, type MeetingSummary };

export interface WebSocketState {
    isConnected: boolean;
    roomId: string | null;
    roomName: string | null;
    recentRooms: RoomInfo[];
    users: User[];
    messages: Message[];
    chatMessages?: Message[]; // Global/Sidebar chat
    files: FileData[];
    error: string | null;
    isHost: boolean;
    localStream: MediaStream | null;
    localScreenStream: MediaStream | null;
    remoteStreams: Map<string, MediaStream>;
    remoteScreenStreams: Map<string, MediaStream>;
    isAudioEnabled: boolean;
    isVideoEnabled: boolean;
    isScreenSharing: boolean;
    presentedFile: FileData | null;
    isPresentingFile: boolean;
    presenterName: string | null;
    isRoomLocked: boolean;
    youtubeVideoId: string | null;
    isYoutubePlaying: boolean;
    youtubeStatus: 'playing' | 'paused' | 'closed';
    youtubeCurrentTime: number;
    selectedVideoDeviceId: string | null;
    selectedAudioDeviceId: string | null;
    isMediaLoading: boolean;
    hasWaitingRoom: boolean;
    waitingUsers: User[];
    isWaiting: boolean;
    accessType: 'public' | 'password' | 'invite' | 'organization';
    inviteToken: string | null;
    scores?: Record<string, number>;
    gameState: GameState & { timeouts?: Record<string, number> };
    virtualBrowserUrl: string | null;
    isVirtualBrowserActive: boolean;
    isNoiseSuppressionEnabled: boolean;
    isAutoFramingEnabled: boolean;
    isAway: boolean;
    lastTranscript: TranscriptData | null;
    meetingSummary: MeetingSummary | null;
    roomMode: RoomMode | null;
    roomModeConfig: RoomModeConfig | null;
    activeTimer: TimerData | null;
    activePoll: PollData | null;
    lateJoinSummary: LateJoinSummaryData | null;
    roomModeSuggestion: RoomSuggestion | null;
    roomStatus: RoomStatus;
    isAiActive: boolean;
}

export interface WebSocketContextType extends WebSocketState {
    socket: Socket | null;
    signaling: SignalingService | null;
    effectiveUserId: string | null;
    user: User | null;
    joinRoom: (
        roomId: string,
        password?: string,
        inviteToken?: string,
        onSuccess?: () => void,
        onError?: (error: string) => void
    ) => void;
    createRoom: (
        roomId: string,
        roomName: string,
        password?: string,
        accessType?: 'public' | 'password' | 'invite' | 'organization',
        onSuccess?: () => void,
        orgId?: string,
        settings?: any // Added settings
    ) => void;
    leaveRoom: (options?: { keepMedia?: boolean }) => void;
    sendMessage: (content: string) => void;
    uploadFile: (file: File) => Promise<boolean>;
    disbandRoom: () => void;
    endSession: () => void;
    promoteToCoHost: (userId: string) => void;
    demoteFromCoHost: (userId: string) => void;
    kickUser: (userId: string) => void;
    muteUser: (userId: string) => void;
    admitUser: (userId: string) => void;
    denyUser: (userId: string) => void;
    admitAllWaitingUsers: () => void;
    toggleRoomLock: () => void;
    updateRoomSettings: (
        roomName?: string,
        password?: string,
        hasWaitingRoom?: boolean,
        accessType?: 'public' | 'password' | 'invite' | 'organization'
    ) => void;
    getRecentRooms: (callback?: (rooms: unknown[]) => void) => void;
    clearError: () => void;
    toggleAudio: () => void;
    toggleVideo: () => void;
    toggleScreenShare: () => void;
    enableMedia: (existingStream?: MediaStream) => Promise<void>;
    disableMedia: () => void;
    toggleNoiseSuppression: () => void;
    toggleAutoFraming: () => void;
    presentFile: (file: FileData) => void;
    presentFileFromUpload: (file: File) => Promise<boolean>;
    closePresentedFile: () => void;
    sendFile: (file: File) => Promise<boolean>;
    startYoutubeVideo: (videoId: string) => void;
    playYoutubeVideo: (time: number) => void;
    pauseYoutubeVideo: (time: number) => void;
    seekYoutubeVideo: (time: number) => void;
    stopYoutubeVideo: () => void;
    startScreenShare: () => Promise<void>;
    stopScreenShare: () => void;
    changeVideoDevice: (deviceId: string) => Promise<void>;
    changeAudioDevice: (deviceId: string) => Promise<void>;
    startGame: (type: 'xoxo' | 'ultimate-xoxo' | 'chess' | 'ludo' | 'snakeladder' | 'connect4' | 'checkers' | 'battleship', players: string[], config?: any) => void;
    makeGameMove: (move: unknown) => void;
    gameTimeout: () => void;
    endGame: () => void;
    startVirtualBrowser: (url: string) => void;
    updateVirtualBrowserUrl: (url: string) => void;
    closeVirtualBrowser: () => void;
    generateSummary: (options?: { broadcast?: boolean }) => void;
    checkRoom: (roomId: string) => Promise<{
        success: boolean;
        exists?: boolean;
        requiresPassword?: boolean;
        accessType?: string;
        name?: string;
        hasWaitingRoom?: boolean;
        error?: string;
    }>;
    analyzeRoom: (roomId: string) => Promise<{ success: boolean; mode: RoomMode; config: RoomModeConfig; confidence: number; activityType: string }>;
    applyRoomMode: (mode: RoomMode, roomId?: string) => Promise<boolean>;
    getRoomSuggestions: (roomId: string) => Promise<RoomSuggestion>;
    verifyRoomPassword: (password: string) => Promise<boolean>;
    toggleAiAssist: () => void;
}

export const WebSocketContext = createContext<WebSocketContextType | null>(null);
