/**
 * Session Memory Utility
 * Light continuity - warm, not creepy
 */

interface SessionData {
  lastEvent?: 'snake' | 'ladder' | null;
  lastPlayed?: number;
  gamesPlayed?: number;
}

const SESSION_KEY = 'snakeladder_session';

/**
 * Save session data (sessionStorage only)
 */
export const saveSession = (data: Partial<SessionData>): void => {
  try {
    const existing = loadSession();
    const updated = { ...existing, ...data, lastPlayed: Date.now() };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(updated));
  } catch (error) {
    console.warn('[Snake & Ladder] Failed to save session:', error);
  }
};

/**
 * Load session data
 */
export const loadSession = (): SessionData => {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.warn('[Snake & Ladder] Failed to load session:', error);
    return {};
  }
};

/**
 * Clear session
 */
export const clearSession = (): void => {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch (error) {
    console.warn('[Snake & Ladder] Failed to clear session:', error);
  }
};
