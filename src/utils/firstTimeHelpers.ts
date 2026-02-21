/**
 * First-time helper utilities for managing one-time tooltips and onboarding
 */

const STORAGE_PREFIX = 'cospira_firsttime_';

export const FirstTimeFlags = {
  MANIFEST_CONTENT: `${STORAGE_PREFIX}manifest_content`,
  COMBAT_STATIONS: `${STORAGE_PREFIX}combat_stations`,
  ARENA_OVERLORD: `${STORAGE_PREFIX}arena_overlord`,
  SOFT_ONBOARDING: `${STORAGE_PREFIX}soft_onboarding`,
  CONTROLS_HINT: `${STORAGE_PREFIX}controls_hint`,
  SHORTCUT_HINT: `${STORAGE_PREFIX}shortcut_hint`,
  PIN_HINT: `${STORAGE_PREFIX}pin_hint`,
  DASHBOARD_FIRST_VISIT: `${STORAGE_PREFIX}dashboard_first_visit`,
} as const;

/**
 * Check if a first-time flag has been shown
 */
export const hasSeenFirstTime = (flag: string): boolean => {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(flag) === 'true';
};

/**
 * Mark a first-time flag as shown
 */
export const markFirstTimeSeen = (flag: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(flag, 'true');
};

/**
 * Reset all first-time flags (for testing)
 */
export const resetAllFirstTimeFlags = (): void => {
  if (typeof window === 'undefined') return;
  Object.values(FirstTimeFlags).forEach(flag => {
    localStorage.removeItem(flag);
  });
};
