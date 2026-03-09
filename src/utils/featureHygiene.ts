/**
 * COSPIRA FEATURE HYGIENE SYSTEM
 * Tracks usage of "nice-to-have" features to determine if they should be killed.
 * Rule: If a feature has < 5% usage after 30 days, it is marked for deprecation.
 */

const STORAGE_KEY = 'cospira_feature_usage';

export const Features = {
  VIRTUAL_BROWSER: 'virtual_browser',
  GAMES_LUDO: 'game_ludo',
  GAMES_CHESS: 'game_chess',
  WHITEBOARD: 'whiteboard',
  SCREEN_SHARE: 'screen_share',
  REACTION_EMOJI: 'reaction_emoji',
  AI_SUMMARY: 'ai_summary',
  YOUTUBE_SYNC: 'youtube_sync',
} as const;

interface UsageData {
  [featureId: string]: {
    count: number;
    lastUsed: number;
    firstUsed: number;
  };
}

export const trackFeatureUsage = (featureId: string) => {
  if (typeof window === 'undefined') return;

  try {
    const currentData: UsageData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');

    if (!currentData[featureId]) {
      currentData[featureId] = {
        count: 0,
        lastUsed: Date.now(),
        firstUsed: Date.now(),
      };
    }

    currentData[featureId].count++;
    currentData[featureId].lastUsed = Date.now();

    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentData));

    // Log for analytics (mock)
    // eslint-disable-next-line no-console
    console.log(
      `[Feature Hygiene] Tracked usage for: ${featureId}. Total: ${currentData[featureId].count}`
    );
  } catch (e) {
    console.error('[Feature Hygiene] Failed to track usage', e);
  }
};

export const getFeatureUsageReport = () => {
  if (typeof window === 'undefined') return null;
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
};
