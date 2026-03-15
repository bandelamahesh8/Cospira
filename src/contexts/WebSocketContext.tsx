import React, { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { WebSocketContext, WebSocketContextType } from './WebSocketContextValue';
import { ConnectionProvider, useConnection } from './ConnectionContext';
import { RoomProvider } from './RoomContext';
import { useRoomContext } from '@/hooks/useRoomContext';
import { MediaProvider } from './MediaContext';
import { useMedia } from '@/hooks/useMedia';
import { ChatProvider } from './ChatContext';
import { useChat } from '@/hooks/useChat';
import { GameProvider } from './GameContext';
import { useGame } from '@/hooks/useGame';

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ConnectionProvider>
      <RoomProvider>
        <MediaProvider>
          <ChatProvider>
            <GameProvider>
              <WebSocketManager>{children}</WebSocketManager>
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
  const room = useRoomContext();
  const media = useMedia();
  const chat = useChat();
  const game = useGame();

  // Combine all contexts into the legacy WebSocketContext interface
  const value = useMemo(
    () =>
      ({
        // Connection
        socket: conn.socket,
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
        user: user as unknown,
        effectiveUserId: user?.id || null,

        // Legacy method mappings
        toggleScreenShare: () =>
          media.isScreenSharing ? media.stopScreenShare() : media.startScreenShare(),
        presentFileFromUpload: chat.uploadFile,
        sendFile: chat.uploadFile,
        makeGameMove: game.makeMove,
        admitAllWaitingUsers: () =>
          room.waitingUsers.forEach((u: { id: string }) => room.admitUser(u.id)),
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
        analyzeRoom: async () => ({
          success: false,
          mode: 'fun' as const,
          config: {} as Record<string, unknown>,
          confidence: 0,
          activityType: '',
        }),
        applyRoomMode: async () => false,
        getRoomSuggestions: async () => ({}) as Record<string, unknown>,
        verifyRoomPassword: async () => false,
        toggleAiAssist: () => {},
        seekYoutubeVideo: () => {},
        pauseRoomTimer: () => {},
        resumeRoomTimer: () => {},
        stopRoomTimer: () => {},
      }) as unknown as WebSocketContextType,
    [conn, room, media, chat, game, user]
  );

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
};
