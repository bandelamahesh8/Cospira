import React, { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { WebSocketContext, WebSocketContextType } from './WebSocketContextValue';
import { ConnectionProvider, useConnection } from './ConnectionContext';
import { RoomProvider, useRoom } from './RoomContext';
import { MediaProvider, useMedia } from './MediaContext';
import { ChatProvider, useChat } from './ChatContext';
import { GameProvider, useGame } from './GameContext';

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ConnectionProvider>
      <RoomProvider>
        <MediaProvider>
          <ChatProvider>
            <GameProvider>
              <WebSocketManager>
                {children}
              </WebSocketManager>
            </GameProvider>
          </ChatProvider>
        </MediaProvider>
      </RoomProvider>
    </ConnectionProvider>
  );
};

const WebSocketManager: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const conn = useConnection();
  const room = useRoom();
  const media = useMedia();
  const chat = useChat();
  const game = useGame();

  // Combine all contexts into the legacy WebSocketContext interface
  const value = useMemo(() => ({
    // Connection
    socket: conn.socket,
    signaling: conn.signaling,
    isConnected: conn.isConnected,
    error: conn.error,
    
    // Room
    ...room,
    
    // Media
    ...media,
    
    // Chat
    ...chat,
    
    // Game
    ...game,
    
    // Auth bridge
    user: user as any,
    effectiveUserId: user?.id || null,

    // Legacy method mappings
    toggleScreenShare: () => media.isScreenSharing ? media.stopScreenShare() : media.startScreenShare(),
    presentFileFromUpload: chat.uploadFile,
    sendFile: chat.uploadFile,
    makeGameMove: game.makeMove,
    admitAllWaitingUsers: () => room.waitingUsers.forEach(u => room.admitUser(u.id)),
    updateRoomSettings: room.updateSettings,
    startRoomTimer: room.startTimer,
    
    // Placeholders for remaining interface fields to satisfy TypeScript
    leaveRoom: room.leaveRoom || (() => {}),
    disbandRoom: room.disbandRoom || (() => {}),
    endSession: () => {},
    kickUser: room.kickUser || (() => {}),
    muteUser: room.muteUser || (() => {}),
    admitUser: room.admitUser || (() => {}),
    denyUser: room.denyUser || (() => {}),
    promoteToCoHost: room.promoteToCohost || (() => {}),
    demoteFromCoHost: room.demoteFromCohost || (() => {}),
    toggleRoomLock: room.toggleRoomLock || (() => {}),
    getRecentRooms: () => {},
    clearError: () => {},
    changeVideoDevice: async () => {},
    changeAudioDevice: async () => {},
    repairMedia: async () => {},
    gameTimeout: () => {},
    endGame: () => {},
    startVirtualBrowser: () => {},
    updateVirtualBrowserUrl: () => {},
    closeVirtualBrowser: () => {},
    generateSummary: () => {},
    checkRoom: async () => ({ success: false }),
    analyzeRoom: async () => ({ success: false, mode: 'fun' as any, config: {} as any, confidence: 0, activityType: '' }),
    applyRoomMode: async () => false,
    getRoomSuggestions: async () => ({} as any),
    verifyRoomPassword: async () => false,
    toggleAiAssist: () => {},
    seekYoutubeVideo: () => {},
    pauseRoomTimer: () => {},
    resumeRoomTimer: () => {},
    stopRoomTimer: () => {},
  } as unknown as WebSocketContextType), [conn, room, media, chat, game, user]);

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};
