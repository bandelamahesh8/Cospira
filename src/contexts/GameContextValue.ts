import React, { createContext } from 'react';
import { GameState } from '@/types/websocket';

export interface GameContextType {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  startGame: (type: string, players: string[], config?: Record<string, unknown>) => void;
  makeMove: (move: unknown) => void;
  endGame: () => void;
}

export const GameContext = createContext<GameContextType | undefined>(undefined);
