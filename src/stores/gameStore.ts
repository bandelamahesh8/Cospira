import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { PlayerProfile, GameStats, GameType, MatchMode } from '@/types/player';
import { GameState, GameEngine } from '@/game-engine/core/GameEngine.interface';
import { createGameEngine } from '@/game-engine';

/**
 * Game Store Interface
 *
 * Centralized state management for the gaming ecosystem
 */
interface GameStore {
  // Player State
  playerProfile: PlayerProfile | null;
  gameStats: Record<GameType, GameStats>;

  // Active Game
  activeGame: GameState | null;
  gameEngine: GameEngine | null;

  // Matchmaking
  isSearching: boolean;
  matchmakingGameType: GameType | null;
  matchmakingMode: MatchMode | null;
  queueStartTime: number | null;
  estimatedWaitTime: number;

  // UI State
  showGameSelector: boolean;
  showLeaderboard: boolean;
  showProfile: boolean;

  // Actions - Player
  setPlayerProfile: (profile: PlayerProfile | null) => void;
  updateGameStats: (gameType: GameType, stats: Partial<GameStats>) => void;

  // Actions - Game
  startGame: (gameType: GameType, gameState: GameState) => void;
  endGame: () => void;
  updateGameState: (state: GameState) => void;

  // Actions - Matchmaking
  startMatchmaking: (gameType: GameType, mode: MatchMode) => void;
  stopMatchmaking: () => void;
  updateWaitTime: (seconds: number) => void;

  // Actions - UI
  toggleGameSelector: () => void;
  toggleLeaderboard: () => void;
  toggleProfile: () => void;

  // Reset
  reset: () => void;
}

const initialState = {
  playerProfile: null,
  gameStats: {} as Record<GameType, GameStats>,
  activeGame: null,
  gameEngine: null,
  isSearching: false,
  matchmakingGameType: null,
  matchmakingMode: null,
  queueStartTime: null,
  estimatedWaitTime: 0,
  showGameSelector: false,
  showLeaderboard: false,
  showProfile: false,
};

/**
 * Game Store
 *
 * Uses Zustand with immer for immutable state updates,
 * devtools for debugging, and persistence for offline support.
 */
export const useGameStore = create<GameStore>()(
  devtools(
    persist(
      immer((set) => ({
        ...initialState,

        // Player Actions
        setPlayerProfile: (profile) =>
          set((state) => {
            state.playerProfile = profile;
          }),

        updateGameStats: (gameType, stats) =>
          set((state) => {
            if (!state.gameStats[gameType]) {
              state.gameStats[gameType] = stats as GameStats;
            } else {
              state.gameStats[gameType] = {
                ...state.gameStats[gameType],
                ...stats,
              };
            }
          }),

        // Game Actions
        startGame: (gameType, gameState) =>
          set((state) => {
            state.activeGame = gameState;
            state.gameEngine = createGameEngine(gameType);
            state.showGameSelector = false;
          }),

        endGame: () =>
          set((state) => {
            state.activeGame = null;
            state.gameEngine = null;
          }),

        updateGameState: (gameState) =>
          set((state) => {
            state.activeGame = gameState;
          }),

        // Matchmaking Actions
        startMatchmaking: (gameType, mode) =>
          set((state) => {
            state.isSearching = true;
            state.matchmakingGameType = gameType;
            state.matchmakingMode = mode;
            state.queueStartTime = Date.now();
            state.estimatedWaitTime = 0;
          }),

        stopMatchmaking: () =>
          set((state) => {
            state.isSearching = false;
            state.matchmakingGameType = null;
            state.matchmakingMode = null;
            state.queueStartTime = null;
            state.estimatedWaitTime = 0;
          }),

        updateWaitTime: (seconds) =>
          set((state) => {
            state.estimatedWaitTime = seconds;
          }),

        // UI Actions
        toggleGameSelector: () =>
          set((state) => {
            state.showGameSelector = !state.showGameSelector;
          }),

        toggleLeaderboard: () =>
          set((state) => {
            state.showLeaderboard = !state.showLeaderboard;
          }),

        toggleProfile: () =>
          set((state) => {
            state.showProfile = !state.showProfile;
          }),

        // Reset
        reset: () => set(initialState),
      })),
      {
        name: 'cospira-game-store',
        partialize: (state) => ({
          // Only persist player data, not active game state
          playerProfile: state.playerProfile,
          gameStats: state.gameStats,
        }),
      }
    ),
    { name: 'GameStore' }
  )
);

/**
 * Selectors for optimized re-renders
 */
export const usePlayerProfile = () => useGameStore((state) => state.playerProfile);
export const useActiveGame = () => useGameStore((state) => state.activeGame);
export const useIsSearching = () => useGameStore((state) => state.isSearching);
export const useGameStats = (gameType: GameType) =>
  useGameStore((state) => state.gameStats[gameType]);
