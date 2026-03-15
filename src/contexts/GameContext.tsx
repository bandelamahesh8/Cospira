import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { GameState } from '@/types/websocket';
import { useConnection } from './ConnectionContext';
import { useRoom } from './RoomContext';
import { toast } from 'sonner';

interface GameContextType {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  startGame: (type: string, players: string[], config?: Record<string, any>) => void;
  makeMove: (move: any) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [gameState, setGameState] = useState<GameState>({
    isActive: false,
    type: null,
    players: [],
    turn: null,
    board: null,
    winner: null,
    startGame: () => {},
  });

  const { socket, isConnected } = useConnection();
  const { roomId } = useRoom();

  useEffect(() => {
    if (!socket || !isConnected) return;

    const onGameStarted = (state: GameState) => setGameState(state);
    const onGameMove = (state: GameState) => setGameState(state);
    const onGameEnded = (state: GameState) => {
      setGameState(state);
      if (state.winner) {
        const winner = state.players.find(p => p.id === state.winner)?.name || state.winner;
        toast.success('Game Over', { description: `Winner: ${winner}` });
      }
    };

    socket.on('game:started', onGameStarted);
    socket.on('game:move', onGameMove);
    socket.on('game:ended', onGameEnded);

    return () => {
      socket.off('game:started', onGameStarted);
      socket.off('game:move', onGameMove);
      socket.off('game:ended', onGameEnded);
    };
  }, [socket, isConnected]);

  const startGame = useCallback((type: string, players: string[], config?: Record<string, any>) => {
    if (!socket || !roomId) return;
    socket.emit('game:start', { roomId, type, players, config });
  }, [socket, roomId]);

  const makeMove = useCallback((move: any) => {
    if (!socket || !roomId) return;
    socket.emit('game:move', { roomId, move });
  }, [socket, roomId]);

  return (
    <GameContext.Provider value={{ gameState, setGameState, startGame, makeMove }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within GameProvider');
  return context;
};