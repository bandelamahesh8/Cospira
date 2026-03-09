/**
 * Session History Tracking
 * Stores game results and statistics in localStorage
 */

export interface GameSession {
  id: string;
  timestamp: number;
  result: 'win' | 'loss' | 'draw';
  opponent: string;
  moves: number;
  duration: number; // seconds
}

const HISTORY_STORAGE_KEY = 'chess_session_history';
const MAX_HISTORY_SIZE = 50; // Keep last 50 games

/**
 * Save a completed game session
 */
export const saveGameSession = (session: Omit<GameSession, 'id' | 'timestamp'>): void => {
  try {
    const history = getSessionHistory();
    const newSession: GameSession = {
      ...session,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };

    history.unshift(newSession);

    // Keep only last MAX_HISTORY_SIZE games
    const trimmed = history.slice(0, MAX_HISTORY_SIZE);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.warn('[Session History] Failed to save session:', error);
  }
};

/**
 * Get all stored game sessions
 */
export const getSessionHistory = (): GameSession[] => {
  try {
    const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.warn('[Session History] Failed to load history:', error);
    return [];
  }
};

/**
 * Calculate statistics from session history
 */
export const getSessionStats = () => {
  const history = getSessionHistory();
  const wins = history.filter((g) => g.result === 'win').length;
  const losses = history.filter((g) => g.result === 'loss').length;
  const draws = history.filter((g) => g.result === 'draw').length;

  return {
    total: history.length,
    wins,
    losses,
    draws,
    winRate: history.length > 0 ? (wins / history.length) * 100 : 0,
  };
};

/**
 * Clear all session history
 */
export const clearHistory = (): void => {
  try {
    localStorage.removeItem(HISTORY_STORAGE_KEY);
  } catch (error) {
    console.warn('[Session History] Failed to clear history:', error);
  }
};
