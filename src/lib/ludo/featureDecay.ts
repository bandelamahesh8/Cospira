/**
 * Feature Decay Manager
 * Features: Auto-disable unused features to keep UI lean
 */

interface FeatureUsage {
  [key: string]: number; // timestamp of last use
}

const USAGE_KEY = 'ludo_feature_usage';
const DECAY_THRESHOLD_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Track feature usage
 */
export const trackFeatureUsage = (featureName: string): void => {
  try {
    const usage = getFeatureUsage();
    usage[featureName] = Date.now();
    localStorage.setItem(USAGE_KEY, JSON.stringify(usage));
  } catch (error) {
    console.warn('[Feature Decay] Failed to track usage:', error);
  }
};

/**
 * Get feature usage data
 */
export const getFeatureUsage = (): FeatureUsage => {
  try {
    const stored = localStorage.getItem(USAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.warn('[Feature Decay] Failed to load usage:', error);
    return {};
  }
};

/**
 * Get list of features to hide (unused for 30+ days)
 */
export const getDecayedFeatures = (): string[] => {
  const usage = getFeatureUsage();
  const now = Date.now();
  const decayed: string[] = [];

  Object.entries(usage).forEach(([feature, lastUsed]) => {
    if (now - lastUsed > DECAY_THRESHOLD_MS) {
      decayed.push(feature);
    }
  });

  return decayed;
};

/**
 * Check if feature should be hidden
 */
export const shouldHideFeature = (featureName: string): boolean => {
  const usage = getFeatureUsage();
  const lastUsed = usage[featureName];

  if (!lastUsed) return false; // Never used, keep visible

  const now = Date.now();
  return now - lastUsed > DECAY_THRESHOLD_MS;
};

/**
 * Reset feature usage (make visible again)
 */
export const resetFeatureDecay = (featureName: string): void => {
  trackFeatureUsage(featureName);
};
