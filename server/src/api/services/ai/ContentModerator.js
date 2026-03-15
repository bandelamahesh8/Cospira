import logger from '../../../shared/logger.js';

/**
 * AI Content Moderator
 * Real-time moderation for chat messages and voice transcripts
 * Detects toxic content, profanity, harassment, and other violations
 */

// Severity levels
export const SEVERITY = {
  SAFE: 'safe',
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

// Violation types
export const VIOLATION_TYPES = {
  PROFANITY: 'profanity',
  HARASSMENT: 'harassment',
  HATE_SPEECH: 'hate_speech',
  SEXUAL_CONTENT: 'sexual_content',
  VIOLENCE: 'violence',
  SPAM: 'spam',
  PERSONAL_INFO: 'personal_info'
};

// Keyword patterns for different violation types
const PATTERNS = {
  profanity: [
    /\b(fuck|shit|damn|bitch|asshole|bastard|crap)\b/gi,
    /\b(wtf|stfu|gtfo|ffs)\b/gi
  ],
  harassment: [
    /\b(kill yourself|kys|die|loser|idiot|stupid|dumb)\b/gi,
    /\b(shut up|go away|nobody likes you)\b/gi
  ],
  hate_speech: [
    /\b(racist|sexist|homophobic|transphobic)\b/gi,
    // Add more patterns but be careful with false positives
  ],
  sexual_content: [
    /\b(porn|xxx|sex|nude|naked)\b/gi,
    /\b(onlyfans|nsfw)\b/gi
  ],
  violence: [
    /\b(kill|murder|attack|hurt|harm|beat up)\b/gi,
    /\b(weapon|gun|knife|bomb)\b/gi
  ],
  spam: [
    /(.)\1{10,}/gi, // Repeated characters
    /\b(buy now|click here|limited offer|act now)\b/gi,
    /(https?:\/\/[^\s]+){3,}/gi // Multiple URLs
  ],
  personal_info: [
    /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, // Phone numbers
    /\b\d{3}[-]?\d{2}[-]?\d{4}\b/g, // SSN pattern
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi // Email
  ]
};

// Action thresholds
const ACTION_THRESHOLDS = {
  [SEVERITY.SAFE]: { action: 'none', score: 0 },
  [SEVERITY.LOW]: { action: 'warn', score: 1 },
  [SEVERITY.MEDIUM]: { action: 'mute_temporary', score: 2 },
  [SEVERITY.HIGH]: { action: 'mute_extended', score: 3 },
  [SEVERITY.CRITICAL]: { action: 'kick', score: 4 }
};

/**
 * Moderate content for violations
 * @param {string} content - Text content to moderate
 * @param {Object} context - Additional context (userId, roomId, etc.)
 * @returns {Object} Moderation result
 */
export function moderateContent(content, context = {}) {
  try {
    if (!content || typeof content !== 'string') {
      return {
        safe: true,
        severity: SEVERITY.SAFE,
        violations: []
      };
    }

    const violations = [];
    let maxSeverity = SEVERITY.SAFE;
    let totalScore = 0;

    // Check each violation type
    for (const [type, patterns] of Object.entries(PATTERNS)) {
      for (const pattern of patterns) {
        const matches = content.match(pattern);
        if (matches && matches.length > 0) {
          const violation = {
            type,
            matches: matches.slice(0, 5), // Limit to 5 matches
            count: matches.length,
            severity: calculateSeverity(type, matches.length)
          };

          violations.push(violation);
          totalScore += getSeverityScore(violation.severity);

          // Update max severity
          if (getSeverityScore(violation.severity) > getSeverityScore(maxSeverity)) {
            maxSeverity = violation.severity;
          }
        }
      }
    }

    // Determine overall severity and action
    const overallSeverity = determineOverallSeverity(totalScore);
    const action = ACTION_THRESHOLDS[overallSeverity].action;

    const result = {
      safe: violations.length === 0,
      severity: overallSeverity,
      violations,
      action,
      score: totalScore,
      timestamp: new Date().toISOString(),
      context
    };

    if (!result.safe) {
      logger.warn(`[ContentModerator] Violation detected: ${overallSeverity} - ${violations.length} violations`);
    }

    return result;

  } catch (error) {
    logger.error('[ContentModerator] Error moderating content:', error);
    return {
      safe: true,
      severity: SEVERITY.SAFE,
      violations: [],
      error: error.message
    };
  }
}

/**
 * Calculate severity based on violation type and frequency
 * @param {string} type - Violation type
 * @param {number} count - Number of matches
 * @returns {string} Severity level
 */
function calculateSeverity(type, count) {
  // Critical violations
  if ([VIOLATION_TYPES.HATE_SPEECH, VIOLATION_TYPES.HARASSMENT].includes(type)) {
    return count >= 3 ? SEVERITY.CRITICAL : SEVERITY.HIGH;
  }

  // High severity violations
  if ([VIOLATION_TYPES.VIOLENCE, VIOLATION_TYPES.SEXUAL_CONTENT].includes(type)) {
    return count >= 2 ? SEVERITY.HIGH : SEVERITY.MEDIUM;
  }

  // Medium severity violations
  if ([VIOLATION_TYPES.PROFANITY, VIOLATION_TYPES.PERSONAL_INFO].includes(type)) {
    return count >= 3 ? SEVERITY.MEDIUM : SEVERITY.LOW;
  }

  // Low severity violations
  if (type === VIOLATION_TYPES.SPAM) {
    return count >= 5 ? SEVERITY.MEDIUM : SEVERITY.LOW;
  }

  return SEVERITY.LOW;
}

/**
 * Get numeric score for severity
 * @param {string} severity - Severity level
 * @returns {number} Numeric score
 */
function getSeverityScore(severity) {
  return ACTION_THRESHOLDS[severity]?.score || 0;
}

/**
 * Determine overall severity from total score
 * @param {number} totalScore - Total violation score
 * @returns {string} Overall severity
 */
function determineOverallSeverity(totalScore) {
  if (totalScore >= 4) return SEVERITY.CRITICAL;
  if (totalScore >= 3) return SEVERITY.HIGH;
  if (totalScore >= 2) return SEVERITY.MEDIUM;
  if (totalScore >= 1) return SEVERITY.LOW;
  return SEVERITY.SAFE;
}

/**
 * Filter/censor content based on moderation result
 * @param {string} content - Original content
 * @param {Object} moderationResult - Result from moderateContent()
 * @returns {string} Filtered content
 */
export function filterContent(content, moderationResult) {
  if (moderationResult.safe) {
    return content;
  }

  let filtered = content;

  // Replace violations with asterisks
  for (const violation of moderationResult.violations) {
    for (const match of violation.matches) {
      const replacement = '*'.repeat(match.length);
      filtered = filtered.replace(new RegExp(match, 'gi'), replacement);
    }
  }

  return filtered;
}

/**
 * Check if user should be auto-moderated based on history
 * @param {Array} violationHistory - User's violation history
 * @returns {Object} Auto-moderation decision
 */
export function checkAutoModeration(violationHistory) {
  if (!violationHistory || violationHistory.length === 0) {
    return { shouldModerate: false };
  }

  // Count violations in last hour
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  const recentViolations = violationHistory.filter(
    v => new Date(v.timestamp).getTime() > oneHourAgo
  );

  const criticalCount = recentViolations.filter(v => v.severity === SEVERITY.CRITICAL).length;
  const highCount = recentViolations.filter(v => v.severity === SEVERITY.HIGH).length;
  const totalCount = recentViolations.length;

  // Auto-kick for multiple critical violations
  if (criticalCount >= 2) {
    return {
      shouldModerate: true,
      action: 'kick',
      reason: 'Multiple critical violations'
    };
  }

  // Extended mute for multiple high violations
  if (highCount >= 3 || totalCount >= 5) {
    return {
      shouldModerate: true,
      action: 'mute_extended',
      reason: 'Repeated violations',
      duration: 600000 // 10 minutes
    };
  }

  // Temporary mute for moderate violations
  if (totalCount >= 3) {
    return {
      shouldModerate: true,
      action: 'mute_temporary',
      reason: 'Multiple violations',
      duration: 120000 // 2 minutes
    };
  }

  return { shouldModerate: false };
}

/**
 * Generate moderation report
 * @param {Array} violations - Array of violation results
 * @returns {Object} Summary report
 */
export function generateModerationReport(violations) {
  const report = {
    totalViolations: violations.length,
    bySeverity: {},
    byType: {},
    timeline: []
  };

  for (const severity of Object.values(SEVERITY)) {
    report.bySeverity[severity] = violations.filter(v => v.severity === severity).length;
  }

  for (const type of Object.values(VIOLATION_TYPES)) {
    report.byType[type] = violations.filter(v => 
      v.violations.some(viol => viol.type === type)
    ).length;
  }

  // Group by hour
  const hourlyViolations = {};
  for (const violation of violations) {
    const hour = new Date(violation.timestamp).toISOString().slice(0, 13);
    hourlyViolations[hour] = (hourlyViolations[hour] || 0) + 1;
  }

  report.timeline = Object.entries(hourlyViolations).map(([hour, count]) => ({
    hour,
    count
  }));

  return report;
}

export default {
  moderateContent,
  filterContent,
  checkAutoModeration,
  generateModerationReport,
  SEVERITY,
  VIOLATION_TYPES
};
