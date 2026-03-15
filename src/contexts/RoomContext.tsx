import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { User, RoomInfo, RoomJoinedData, TimerType, TimerAction, TimerData, PollData, LateJoinSummaryData, RoomStatus } from '@/types/websocket';
import { RoomMode, RoomModeConfig, getModeConfig, normalizeRoomMode } from '@/services/RoomIntelligence';
import { useConnection } from './ConnectionContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface RoomState {
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

interface RoomContextType extends RoomState {
  updateRoomState: (update: Partial<RoomState>) => void;
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  createRoom: (roomId: string, roomName: string, password?: string, accessType?: string, onSuccess?: () => void, orgId?: string, settings?: Record<string, any>) => void;
  joinRoom: (roomId: string, password?: string, inviteToken?: string, onSuccess?: () => void, onError?: (error: string) => void, isGhost?: boolean) => void;
  leaveRoom: (options?: { keepMedia?: boolean }) => void;
  disbandRoom: () => void;
  kickUser: (userId: string) => void;
  muteUser: (userId: string) => void;
  admitUser: (userId: string) => void;
  denyUser: (userId: string) => void;
  promoteToCohost: (userId: string) => void;
  demoteFromCohost: (userId: string) => void;
  toggleRoomLock: () => void;
  updateSettings: (settings: Record<string, any>) => void;
  startTimer: (duration: number, label: string, type?: TimerType, action?: TimerAction) => void;
}

const RoomContext = createContext<RoomContextType | undefined>(undefined);

export const RoomProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<RoomState>({
    roomId: null,
    roomName: null,
    organizationName: null,
    organizationId: null,
    users: [],
    isHost: false,
    isSuperHost: false,
    isGhost: false,
    roomMode: null,
    roomModeConfig: null,
    recentRooms: [],
    isRoomLocked: false,
    waitingUsers: [],
    hasWaitingRoom: false,
    activeTimer: null,
    activePoll: null,
    lateJoinSummary: null,
    roomStatus: 'live',
    roomCreatedAt: null,
  });

  const { socket, isConnected } = useConnection();
  const navigate = useNavigate();

  const updateRoomState = useCallback((update: Partial<RoomState>) => {
    setState(prev => ({ ...prev, ...update }));
  }, []);

  const setUsers: React.Dispatch<React.SetStateAction<User[]>> = useCallback((update) => {
    setState(prev => ({
      ...prev,
      users: typeof update === 'function' ? update(prev.users) : update
    }));
  }, []);

  useEffect(() => {
    if (!socket || !isConnected) return;
    const onRoomJoined = (data: RoomJoinedData) => {
      const mode = normalizeRoomMode((data.settings?.mode as string) || (data.mode as string) || 'mixed');
      setState(prev => ({
        ...prev,
        roomId: data.roomId,
        roomName: data.name || data.roomId,
        users: data.users || [],
        isHost: data.isHost,
        isSuperHost: data.isSuperHost || false,
        roomMode: mode,
        roomModeConfig: getModeConfig(mode),
        isRoomLocked: data.isLocked || false,
      }));
    };
    const onUserJoined = (user: User) => setState(prev => ({ ...prev, users: [...prev.users.filter(u => u.id === user.id), user] }));
    const onUserLeft = (userId: string) => setState(prev => ({ ...prev, users: prev.users.filter(u => u.id !== userId) }));
    socket.on('room-joined', onRoomJoined);
    socket.on('user-joined', onUserJoined);
    socket.on('user-left', onUserLeft);
    return () => {
      socket.off('room-joined', onRoomJoined);
      socket.off('user-joined', onUserJoined);
      socket.off('user-left', onUserLeft);
    };
  }, [socket, isConnected]);

  const createRoom = useCallback((roomId: string, roomName: string, password?: string, accessType = 'public', onSuccess?: () => void) => {
    socket?.emit('create-room', { roomId, roomName, password, accessType }, (res: { success: boolean, error?: string }) => {
      if (res.success) onSuccess?.(); else toast.error('Creation failed', { description: res.error });
    });
  }, [socket]);

  const joinRoom = useCallback((roomId: string, password?: string, inviteToken?: string, onSuccess?: () => void, onError?: (err: string) => void) => {
    socket?.emit('join-room', { roomId, password, inviteToken }, (res: { success: boolean, error?: string }) => {
      if (res.success) onSuccess?.(); else onError?.(res.error || 'Unknown error');
    });
  }, [socket]);

  const leaveRoom = useCallback(() => {
    if (state.roomId) {
      socket?.emit('leave-room', { roomId: state.roomId });
      setState(prev => ({ ...prev, roomId: null, users: [], isHost: false }));
      navigate('/');
    }
  }, [state.roomId, socket, navigate]);

  const disbandRoom = useCallback(() => { if (state.roomId && state.isHost) socket?.emit('disband-room', { roomId: state.roomId }); }, [state.roomId, state.isHost, socket]);
  const kickUser = useCallback((userId: string) => socket?.emit('kick-user', { roomId: state.roomId, userId }), [state.roomId, socket]);
  const muteUser = useCallback((userId: string) => socket?.emit('mute-user', { roomId: state.roomId, userId }), [state.roomId, socket]);
  const admitUser = useCallback((userId: string) => socket?.emit('admit-user', { roomId: state.roomId, userId }), [state.roomId, socket]);
  const denyUser = useCallback((userId: string) => socket?.emit('deny-user', { roomId: state.roomId, userId }), [state.roomId, socket]);
  const promoteToCohost = useCallback((userId: string) => socket?.emit('promote-cohost', { roomId: state.roomId, userId }), [state.roomId, socket]);
  const demoteFromCohost = useCallback((userId: string) => socket?.emit('demote-cohost', { roomId: state.roomId, userId }), [state.roomId, socket]);
  const toggleRoomLock = useCallback(() => socket?.emit('toggle-lock', { roomId: state.roomId, locked: !state.isRoomLocked }), [state.roomId, state.isRoomLocked, socket]);
  const updateSettings = useCallback((settings: Record<string, any>) => socket?.emit('update-settings', { roomId: state.roomId, settings }), [state.roomId, socket]);
  const startTimer = useCallback((duration: number, label: string, type?: TimerType, action?: TimerAction) => socket?.emit('start-timer', { roomId: state.roomId, duration, label, type, action }), [state.roomId, socket]);

  return (
    <RoomContext.Provider value={{
      ...state, updateRoomState, setUsers, createRoom, joinRoom, leaveRoom, disbandRoom,
      kickUser, muteUser, admitUser, denyUser, promoteToCohost, demoteFromCohost,
      toggleRoomLock, updateSettings, startTimer
    }}>
      {children}
    </RoomContext.Provider>
  );
};

export const useRoom = () => {
  const context = useContext(RoomContext);
  if (!context) throw new Error('useRoom must be used within RoomProvider');
  return context;
};