import { useEffect, useMemo } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuth } from '@/hooks/useAuth';
import { CarromGame as CarromUI } from '@/carrom/components/CarromGame';
import { CarromGameEngine } from '@/carrom/engine/game-engine';
import { PlayerInput, CarromGameState } from '@/carrom/types/game-state';
import { createInitialGameState } from '@/carrom/utils/game-state-creator';

export const CarromGame = () => {
  const { gameState, makeGameMove, roomId } = useWebSocket();
  const { user } = useAuth();

  // Initialize engine only once
  const gameEngine = useMemo(() => {
    // If we have a board state from server, use it. Otherwise create default.
    if (gameState?.isActive && gameState.type === 'carrom' && gameState.board) {
      return new CarromGameEngine(gameState.board as unknown as CarromGameState);
    }

    // Fallback for initialization
    const dummyPlayer = user?.id || 'player1';
    return new CarromGameEngine(
      createInitialGameState(roomId || 'preview', dummyPlayer, 'player2')
    );
  }, [roomId, user?.id, gameState?.isActive, gameState?.type, gameState?.board]);

  // Sync state from server
  useEffect(() => {
    if (gameState?.isActive && gameState.type === 'carrom' && gameState.board) {
      gameEngine.syncState(gameState.board as unknown as CarromGameState);
    }
  }, [gameState, gameEngine]);

  const handleInput = (input: PlayerInput) => {
    // Optimistic local update
    gameEngine.processInput(input);

    // Remote update
    makeGameMove(input);
  };

  if (!gameState || gameState.type !== 'carrom') {
    return (
      <div className='flex items-center justify-center h-full text-white/50'>
        Initializing Game...
      </div>
    );
  }

  return (
    <CarromUI
      gameEngine={gameEngine}
      currentPlayerId={user?.id || 'spectator'}
      onInput={handleInput}
    />
  );
};
export default CarromGame;
