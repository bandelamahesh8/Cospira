import { SignalingService, SignalingEvents } from '@/services/SignalingService';
import { CreateRoomRequest, JoinRoomRequest, Room } from '../schemas';

interface SocketResponse {
    success: boolean;
    error?: string;
}

interface JoinRoomResponse extends SocketResponse {
    room?: Room;
}

export class RoomSocketService {
    constructor(private signaling: SignalingService) {}

    public joinRoom(data: JoinRoomRequest): Promise<JoinRoomResponse> {
        return new Promise((resolve) => {
            this.signaling.emit('join-room', data, (response: JoinRoomResponse) => {
                resolve(response);
            });
        });
    }

    public createRoom(data: CreateRoomRequest): Promise<void> {
        return new Promise((resolve, reject) => {
             this.signaling.emit('create-room', data, (response: SocketResponse) => {
                 if (response.success) {
                     resolve();
                 } else {
                     reject(response.error || 'Failed to create room');
                 }
             });
        });
    }

    public leaveRoom(roomId: string): void {
        this.signaling.emit('leave-room', { roomId });
    }

    public disbandRoom(roomId: string): void {
        this.signaling.emit('disband-room', { roomId });
    }

    public kickUser(roomId: string, userId: string): void {
        this.signaling.emit('kick-user', { roomId, userId });
    }

    public updateSettings(roomId: string, settings: Record<string, unknown>): void {
        this.signaling.emit('update-room-settings', { roomId, settings });
    }

    public admitUser(roomId: string, userId: string): void {
        this.signaling.emit('admit-user', { roomId, userId });
    }

    public denyUser(roomId: string, userId: string): void {
        this.signaling.emit('deny-user', { roomId, userId });
    }

    public toggleLock(roomId: string): void {
        this.signaling.emit('toggle-room-lock', { roomId });
    }

    public promoteToCohost(roomId: string, userId: string): void {
        this.signaling.emit('promote-to-cohost', { roomId, userId });
    }

    public demoteFromCohost(roomId: string, userId: string): void {
        this.signaling.emit('demote-from-cohost', { roomId, userId });
    }

    public muteUser(roomId: string, userId: string): void {
        this.signaling.emit('mute-user', { roomId, userId });
    }
}
