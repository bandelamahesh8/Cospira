export type User = {
    id: string;
    name: string;
    joinedAt?: Date;
    isHost?: boolean;
    isCoHost?: boolean;
};

export type Message = {
    id: string;
    userId: string;
    userName: string;
    content: string;
    timestamp: Date;
};

export type FileData = {
    id: string;
    userId: string;
    userName: string;
    name: string;
    type: string;
    size: number;
    url: string;
    timestamp: Date;
};

export type RoomInfo = {
    id: string;
    name: string;
    createdAt: Date;
    userCount: number;
    requiresPassword: boolean;
};

export type RoomJoinedData = {
    roomId: string;
    name: string;
    users: User[];
    messages: Message[];
    files: FileData[];
    isHost: boolean;
    hasWaitingRoom: boolean;
    waitingUsers: User[];
    accessType: 'public' | 'password' | 'invite' | 'organization';
    inviteToken: string | null;
    youtubeVideoId: string | null;
    youtubeStatus: 'playing' | 'paused' | 'closed';
    youtubeCurrentTime: number;
    youtubeLastActionTime: number;
    youtubePresenterName: string | null;
};

export type SfuNewProducerData = {
    producerId: string;
    socketId: string;
    kind: string;
};
