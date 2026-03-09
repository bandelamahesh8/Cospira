/**
 * Session Memory Utility
 * Features: Lightweight session-based recall (not creepy)
 */

interface SessionData {
  diceSkin?: string;
  boardTheme?: string;
  boardZoom?: number;
  lastPlayed?: number;
}

const SESSION_KEY = 'ludo_session';

/**
 * Save session data (session storage only, not persistent)
 */
export const saveSession = (data: Partial<SessionData>): void => {
  try {
    const existing = loadSession();
    const updated = { ...existing, ...data, lastPlayed: Date.now() };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(updated));
  } catch (error) {
    console.warn('[Ludo Session] Failed to save session:', error);
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
    console.warn('[Ludo Session] Failed to load session:', error);
    return {};
  }
};

/**
 * Clear session data
 */
export const clearSession = (): void => {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch (error) {
    console.warn('[Ludo Session] Failed to clear session:', error);
  }
};

/**
 * Check if session is recent (within 1 hour)
 */
export const isRecentSession = (): boolean => {
  const session = loadSession();
  if (!session.lastPlayed) return false;

  const hourAgo = Date.now() - 60 * 60 * 1000;
  return session.lastPlayed > hourAgo;
};
