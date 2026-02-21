/**
 * Feature Flags System
 * 
 * Centralized feature flag management for CosPira platform.
 * Enables easy A/B testing, gradual rollouts, and quick feature toggles.
 */

export const FEATURE_FLAGS = {
  // Core Features
  GAMES_ENABLED: true,
  BROWSER_ENABLED: true,
  SCREEN_SHARE_ENABLED: true,
  PDF_UPLOAD_ENABLED: true,
  YOUTUBE_ENABLED: true,
  
  // Advanced Features
  RECORDING_ENABLED: false, // Future feature
  MULTI_USER_ENABLED: true,
  ORGANIZATIONS_ENABLED: true,
  
  // Experimental Features
  AI_ASSISTANT_ENABLED: false, // Future feature
  WHITEBOARD_ENABLED: false, // Future feature
  LIVE_CAPTIONS_ENABLED: false, // Future feature
  
  // Platform Features
  ANALYTICS_ENABLED: true,
  FEEDBACK_ENABLED: true,
  NOTIFICATIONS_ENABLED: true,
} as const;

/**
 * Check if a feature is enabled
 * @param flag - Feature flag to check
 * @returns boolean indicating if feature is enabled
 */
export const isFeatureEnabled = (flag: keyof typeof FEATURE_FLAGS): boolean => {
  return FEATURE_FLAGS[flag];
};

/**
 * Get all enabled features
 * @returns Array of enabled feature names
 */
export const getEnabledFeatures = (): string[] => {
  return Object.entries(FEATURE_FLAGS)
    .filter(([_, enabled]) => enabled)
    .map(([feature]) => feature);
};

/**
 * Get all disabled features
 * @returns Array of disabled feature names
 */
export const getDisabledFeatures = (): string[] => {
  return Object.entries(FEATURE_FLAGS)
    .filter(([_, enabled]) => !enabled)
    .map(([feature]) => feature);
};

/**
 * Check multiple features at once
 * @param flags - Array of feature flags to check
 * @returns boolean indicating if ALL features are enabled
 */
export const areAllFeaturesEnabled = (flags: (keyof typeof FEATURE_FLAGS)[]): boolean => {
  return flags.every(flag => isFeatureEnabled(flag));
};

/**
 * Check if any of the features are enabled
 * @param flags - Array of feature flags to check
 * @returns boolean indicating if ANY feature is enabled
 */
export const isAnyFeatureEnabled = (flags: (keyof typeof FEATURE_FLAGS)[]): boolean => {
  return flags.some(flag => isFeatureEnabled(flag));
};
