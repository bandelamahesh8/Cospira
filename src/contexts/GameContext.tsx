import React, { useState, useEffect, useCallback } from 'react';
import { useConnection } from './ConnectionContext';
import { useRoomContext } from '@/hooks/useRoomContext';
import { toast } from 'sonner';
import { GameState, GamePlayer } from '@/types/websocket';
import { GameContext } from './GameContextValue';

export const GameProvider = ({ children }: { children: React.ReactNode }) => {
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
  const { roomId } = useRoomContext();

  useEffect(() => {
    if (!socket || !isConnected) return;

    const onGameStarted = (state: GameState) => setGameState(state);
    const onGameMove = (state: GameState) => setGameState(state);
    const onGameEnded = (state: GameState) => {
      setGameState(state);
      if (state.winner) {
        const winner =
          state.players.find((p: GamePlayer) => p.id === state.winner)?.name || state.winner;
        toast.success('Game Over', { description: `Winner: ${winner}` });
      }
    };

    socket.on('game-started', onGameStarted);
    socket.on('game-move', onGameMove);
    socket.on('game-ended', onGameEnded);

    return () => {
      socket.off('game-started', onGameStarted);
      socket.off('game-move', onGameMove);
      socket.off('game-ended', onGameEnded);
    };
  }, [socket, isConnected]);

  const startGame = useCallback(
    (type: string, players: string[], config?: Record<string, unknown>) => {
      if (!socket || !roomId) return;
      socket.emit('start-game', { roomId, type, players, config });
    },
    [socket, roomId]
  );

  const makeMove = useCallback(
    (move: unknown) => {
      if (!socket || !roomId) return;
      socket.emit('make-game-move', { roomId, move });
    },
    [socket, roomId]
  );

  const endGame = useCallback(() => {
    if (!socket || !roomId) return;
    socket.emit('end-game', { roomId });
  }, [socket, roomId]);

  return (
    <GameContext.Provider value={{ gameState, setGameState, startGame, makeMove, endGame }}>
      {children}
    </GameContext.Provider>
  );
};
