import React, { createContext } from 'react';
import {
  User,
  RoomInfo,
  TimerType,
  TimerAction,
  TimerData,
  PollData,
  LateJoinSummaryData,
  RoomStatus,
} from '@/types/websocket';
import { RoomMode, RoomModeConfig } from '@/services/RoomIntelligence';

export interface RoomState {
  roomId: string | null;
  roomName: string | null;
  organizationName?: string | null;
  organizationId?: string | null;
  users: User[];
  isHost: boolean;
  isSuperHost: boolean;
  isGhost: boolean;
  roomMode: RoomMode | null;
  roomModeConfig: RoomModeConfig | null;
  recentRooms: RoomInfo[];
  isRoomLocked: boolean;
  waitingUsers: User[];
  hasWaitingRoom: boolean;
  activeTimer: TimerData | null;
  activePoll: PollData | null;
  lateJoinSummary: LateJoinSummaryData | null;
  roomStatus: RoomStatus;
  roomCreatedAt: Date | string | null;
}

export interface RoomContextType extends RoomState {
  updateRoomState: (update: Partial<RoomState>) => void;
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  createRoom: (
    roomId: string,
    roomName: string,
    password?: string,
    accessType?: string,
    onSuccess?: () => void,
    orgId?: string,
    settings?: Record<string, unknown>
  ) => void;
  joinRoom: (
    roomId: string,
    password?: string,
    inviteToken?: string,
    onSuccess?: () => void,
    onError?: (error: string) => void,
    isGhost?: boolean
  ) => void;
  leaveRoom: (options?: { keepMedia?: boolean }) => void;
  disbandRoom: () => void;
  kickUser: (userId: string) => void;
  muteUser: (userId: string) => void;
  admitUser: (userId: string) => void;
  denyUser: (userId: string) => void;
  promoteToCohost: (userId: string) => void;
  demoteFromCohost: (userId: string) => void;
  toggleRoomLock: () => void;
  updateSettings: (settings: Record<string, unknown>) => void;
  startTimer: (duration: number, label: string, type?: TimerType, action?: TimerAction) => void;
}

export const RoomContext = createContext<RoomContextType | undefined>(undefined);
