import { createContext } from 'react';
import { type Socket } from 'socket.io-client';
import { User, Message, FileData } from '@/types/websocket';
import { SignalingService } from '@/lib/signaling';

export interface WebSocketState {
    isConnected: boolean;
    roomId: string | null;
    roomName: string | null;
    users: User[];
    messages: Message[];
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
}

export interface BrowserInput {
    type: 'mousemove' | 'click' | 'keydown' | 'keyup' | 'scroll' | 'navigate';
    x?: number;
    y?: number;
    key?: string;
    deltaY?: number;
    url?: string;
}

export interface WebSocketContextType extends WebSocketState {
    socket: Socket | null;
    signaling: SignalingService | null;
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
        orgId?: string
    ) => void;
    leaveRoom: () => void;
    sendMessage: (content: string) => void;
    uploadFile: (file: File) => Promise<boolean>;
    disbandRoom: () => void;
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
    enableMedia: () => Promise<void>;
    presentFile: (file: FileData) => void;
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
    startBrowserSession: () => void;
    stopBrowserSession: () => void;
    sendBrowserInput: (input: BrowserInput) => void;
}

export const WebSocketContext = createContext<WebSocketContextType | null>(null);
