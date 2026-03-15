import logger from '../../../shared/logger.js';
import { supabase } from '../../../shared/supabase.js';
import { getCache, setCache } from '../../../shared/redis.js';

/**
 * Usage Limits Service
 * Enforces subscription tier limits and tracks usage
 */

// Subscription tiers
export const TIERS = {
  FREE: 'free',
  PRO: 'pro',
  BUSINESS: 'business',
  ENTERPRISE: 'enterprise'
};

// Tier configurations
export const TIER_LIMITS = {
  [TIERS.FREE]: {
    maxDuration: 40 * 60 * 1000, // 40 minutes in ms
    maxParticipants: 4,
    features: {
      transcription: false,
      recording: false,
      aiSummary: false,
      virtualBrowser: false,
      analytics: false,
      customBranding: false
    },
    warningThresholds: [0.8, 0.9] // 80%, 90%
  },
  [TIERS.PRO]: {
    maxDuration: Infinity, // Unlimited
    maxParticipants: 50,
    features: {
      transcription: true,
      recording: true,
      aiSummary: true,
      virtualBrowser: true,
      analytics: true,
      customBranding: false
    },
    warningThresholds: []
  },
  [TIERS.BUSINESS]: {
    maxDuration: Infinity,
    maxParticipants: 200,
    features: {
      transcription: true,
      recording: true,
      aiSummary: true,
      virtualBrowser: true,
      analytics: true,
      customBranding: true,
      prioritySupport: true,
      advancedModeration: true
    },
    warningThresholds: []
  },
  [TIERS.ENTERPRISE]: {
    maxDuration: Infinity,
    maxParticipants: Infinity,
    features: {
      transcription: true,
      recording: true,
      aiSummary: true,
      virtualBrowser: true,
      analytics: true,
      customBranding: true,
      prioritySupport: true,
      advancedModeration: true,
      dedicatedSupport: true,
      sla: true,
      customIntegrations: true
    },
    warningThresholds: []
  }
};

/**
 * Get user's subscription tier
 * @param {string} userId - User ID
 * @returns {Promise<string>} Tier name
 */
export async function getUserTier(userId) {
  try {
    // Check cache first
    const cacheKey = `tier:${userId}`;
    const cachedTier = await getCache(cacheKey);
    if (cachedTier) {
      return cachedTier;
    }

    // Query database
    let tier = TIERS.FREE;
    if (supabase) {
      // Try profiles.tier first
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('tier')
        .eq('id', userId)
        .single();

      if (!profileError && profile?.tier) {
        tier = profile.tier;
      } else {
        // Fallback to subscriptions table
        const { data: subscription, error: subError } = await supabase
          .from('subscriptions')
          .select('tier')
          .eq('user_id', userId)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (!subError && subscription?.tier) {
          tier = subscription.tier;
        }
      }
    } else {
      logger.warn('[UsageLimits] Supabase not available, returning FREE tier');
    }

    // Cache the result for 5 minutes
    await setCache(cacheKey, tier, 300);

    return tier;
  } catch (error) {
    logger.error('[UsageLimits] Error getting user tier:', error);
    return TIERS.FREE;
  }
}

/**
 * Check if user can create/join room
 * @param {string} userId - User ID
 * @param {Object} room - Room data
 * @returns {Promise<Object>} Check result
 */
export async function checkRoomAccess(userId, room) {
  try {
    const tier = await getUserTier(userId);
    const limits = TIER_LIMITS[tier];

    // Check participant limit
    const currentParticipants = room.users ? Object.keys(room.users).length : 0;
    if (currentParticipants >= limits.maxParticipants) {
      return {
        allowed: false,
        reason: 'participant_limit',
        message: `Room has reached the maximum of ${limits.maxParticipants} participants for ${tier} tier.`,
        upgrade: tier === TIERS.FREE
      };
    }

    // Check duration limit (for existing rooms)
    if (room.createdAt && limits.maxDuration !== Infinity) {
      const roomAge = Date.now() - new Date(room.createdAt).getTime();
      if (roomAge >= limits.maxDuration) {
        return {
          allowed: false,
          reason: 'duration_limit',
          message: `Room has exceeded the ${limits.maxDuration / 60000} minute limit for ${tier} tier.`,
          upgrade: true
        };
      }
    }

    return {
      allowed: true,
      tier,
      limits
    };

  } catch (error) {
    logger.error('[UsageLimits] Error checking room access:', error);
    return {
      allowed: true, // Fail open for better UX
      error: error.message
    };
  }
}

/**
 * Check if feature is available for user
 * @param {string} userId - User ID
 * @param {string} feature - Feature name
 * @returns {Promise<boolean>} Feature availability
 */
export async function checkFeatureAccess(userId, feature) {
  try {
    const tier = await getUserTier(userId);
    const limits = TIER_LIMITS[tier];

    return limits.features[feature] === true;

  } catch (error) {
    logger.error('[UsageLimits] Error checking feature access:', error);
    return false;
  }
}

/**
 * Get usage warnings for room
 * @param {Object} room - Room data
 * @param {string} tier - User tier
 * @returns {Array} Warning messages
 */
export function getUsageWarnings(room, tier) {
  const warnings = [];
  const limits = TIER_LIMITS[tier];

  if (limits.maxDuration === Infinity) {
    return warnings;
  }

  const roomAge = Date.now() - new Date(room.createdAt).getTime();
  const usagePercent = roomAge / limits.maxDuration;

  for (const threshold of limits.warningThresholds) {
    if (usagePercent >= threshold && usagePercent < threshold + 0.05) {
      const remainingMinutes = Math.floor((limits.maxDuration - roomAge) / 60000);
      warnings.push({
        level: threshold >= 0.9 ? 'critical' : 'warning',
        message: `${Math.round(threshold * 100)}% of time limit reached. ${remainingMinutes} minutes remaining.`,
        percent: Math.round(usagePercent * 100),
        remaining: remainingMinutes
      });
    }
  }

  return warnings;
}

/**
 * Track room usage
 * @param {string} roomId - Room ID
 * @param {string} userId - User ID (host)
 * @param {Object} metrics - Usage metrics
 */
export async function trackUsage(roomId, userId, metrics) {
  try {
    // TODO: Store in MongoDB for analytics
    // Metrics: duration, participants, features used, etc.
    logger.info(`[UsageLimits] Tracking usage for room ${roomId}:`, metrics);

    // In production, save to database:
    // await UsageLog.create({ roomId, userId, ...metrics, timestamp: new Date() });

  } catch (error) {
    logger.error('[UsageLimits] Error tracking usage:', error);
  }
}

/**
 * Calculate upgrade benefits
 * @param {string} currentTier - Current tier
 * @param {string} targetTier - Target tier
 * @returns {Object} Upgrade benefits
 */
export function getUpgradeBenefits(currentTier, targetTier) {
  const current = TIER_LIMITS[currentTier];
  const target = TIER_LIMITS[targetTier];

  const benefits = {
    duration: target.maxDuration === Infinity ? 'Unlimited' : `${target.maxDuration / 60000} minutes`,
    participants: target.maxParticipants === Infinity ? 'Unlimited' : target.maxParticipants,
    newFeatures: []
  };

  // Find new features
  for (const [feature, enabled] of Object.entries(target.features)) {
    if (enabled && !current.features[feature]) {
      benefits.newFeatures.push(feature);
    }
  }

  return benefits;
}

export default {
  TIERS,
  TIER_LIMITS,
  getUserTier,
  checkRoomAccess,
  checkFeatureAccess,
  getUsageWarnings,
  trackUsage,
  getUpgradeBenefits
};
