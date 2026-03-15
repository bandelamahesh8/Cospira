import logger from '../../logger.js';

/**
 * AI Room Classifier
 * Analyzes room metadata and activity to suggest optimal room modes
 */

// Room mode definitions
export const ROOM_MODES = {
  STUDY: 'study',
  MEETING: 'meeting',
  CASUAL: 'casual',
  GAMING: 'gaming',
  UNKNOWN: 'unknown'
};

// Keywords for classification
const KEYWORDS = {
  study: [
    'study', 'homework', 'exam', 'test', 'quiz', 'lecture', 'class',
    'assignment', 'revision', 'learning', 'tutorial', 'course',
    'education', 'school', 'university', 'college', 'student'
  ],
  meeting: [
    'meeting', 'standup', 'sync', 'review', 'planning', 'discussion',
    'presentation', 'demo', 'retrospective', 'sprint', 'scrum',
    'conference', 'call', 'interview', 'briefing', 'workshop'
  ],
  casual: [
    'hangout', 'chat', 'chill', 'casual', 'friends', 'social',
    'party', 'fun', 'relax', 'catch up', 'talk', 'gossip'
  ],
  gaming: [
    'game', 'gaming', 'play', 'match', 'tournament', 'pvp',
    'multiplayer', 'chess', 'ludo', 'cards', 'tictactoe'
  ]
};

/**
 * Classify room based on title and metadata
 * @param {Object} roomData - Room information
 * @param {string} roomData.name - Room name/title
 * @param {string} roomData.description - Room description (optional)
 * @param {Object} roomData.gameState - Current game state (optional)
 * @returns {Object} Classification result with mode and confidence
 */
export function classifyRoom(roomData) {
  try {
    const { name = '', description = '', gameState } = roomData;
    
    // If game is active, it's definitely gaming mode
    if (gameState && gameState.isActive) {
      return {
        mode: ROOM_MODES.GAMING,
        confidence: 1.0,
        reason: 'Active game detected'
      };
    }

    // Combine title and description for analysis
    const text = `${name} ${description}`.toLowerCase();
    
    // Score each mode based on keyword matches
    const scores = {
      study: scoreText(text, KEYWORDS.study),
      meeting: scoreText(text, KEYWORDS.meeting),
      casual: scoreText(text, KEYWORDS.casual),
      gaming: scoreText(text, KEYWORDS.gaming)
    };

    // Find the highest scoring mode
    const maxScore = Math.max(...Object.values(scores));
    
    // If no keywords match, default to casual
    if (maxScore === 0) {
      return {
        mode: ROOM_MODES.CASUAL,
        confidence: 0.3,
        reason: 'No specific keywords detected, defaulting to casual'
      };
    }

    // Find which mode has the highest score
    const suggestedMode = Object.entries(scores).find(
      ([_, score]) => score === maxScore
    )[0];

    // Calculate confidence (0-1 scale)
    const totalKeywords = Object.values(KEYWORDS).flat().length;
    const confidence = Math.min(maxScore / 5, 1.0); // Cap at 1.0

    return {
      mode: suggestedMode,
      confidence: parseFloat(confidence.toFixed(2)),
      reason: `Matched ${maxScore} keyword(s) for ${suggestedMode} mode`,
      scores
    };

  } catch (error) {
    logger.error('[RoomClassifier] Error classifying room:', error);
    return {
      mode: ROOM_MODES.UNKNOWN,
      confidence: 0,
      reason: 'Classification error',
      error: error.message
    };
  }
}

/**
 * Score text based on keyword matches
 * @param {string} text - Text to analyze
 * @param {string[]} keywords - Keywords to match
 * @returns {number} Number of keyword matches
 */
function scoreText(text, keywords) {
  let score = 0;
  for (const keyword of keywords) {
    if (text.includes(keyword)) {
      score++;
    }
  }
  return score;
}

/**
 * Analyze room activity patterns
 * @param {Object} activityData - Room activity data
 * @param {Array} activityData.transcripts - Recent transcripts
 * @param {Array} activityData.messages - Recent messages
 * @param {number} activityData.duration - Room duration in minutes
 * @returns {Object} Activity analysis
 */
export function analyzeActivity(activityData) {
  try {
    const { transcripts = [], messages = [], duration = 0 } = activityData;
    
    // Combine all text from transcripts and messages
    const allText = [
      ...transcripts.map(t => t.text || ''),
      ...messages.map(m => m.content || '')
    ].join(' ').toLowerCase();

    // Analyze patterns
    const patterns = {
      collaborative: /\b(let's|we should|together|team|group)\b/gi,
      educational: /\b(learn|understand|explain|teach|question)\b/gi,
      casual: /\b(lol|haha|cool|nice|awesome)\b/gi,
      professional: /\b(agenda|action item|deadline|task|project)\b/gi
    };

    const patternScores = {};
    for (const [pattern, regex] of Object.entries(patterns)) {
      const matches = allText.match(regex);
      patternScores[pattern] = matches ? matches.length : 0;
    }

    // Determine activity type
    let activityType = 'unknown';
    const maxPatternScore = Math.max(...Object.values(patternScores));
    
    if (maxPatternScore > 0) {
      activityType = Object.entries(patternScores).find(
        ([_, score]) => score === maxPatternScore
      )[0];
    }

    return {
      activityType,
      patternScores,
      messageCount: messages.length,
      transcriptCount: transcripts.length,
      duration,
      engagement: calculateEngagement(messages, transcripts, duration)
    };

  } catch (error) {
    logger.error('[RoomClassifier] Error analyzing activity:', error);
    return {
      activityType: 'unknown',
      error: error.message
    };
  }
}

/**
 * Calculate engagement score
 * @param {Array} messages - Messages
 * @param {Array} transcripts - Transcripts
 * @param {number} duration - Duration in minutes
 * @returns {number} Engagement score (0-1)
 */
function calculateEngagement(messages, transcripts, duration) {
  if (duration === 0) return 0;
  
  const totalActivity = messages.length + transcripts.length;
  const activityPerMinute = totalActivity / duration;
  
  // Normalize to 0-1 scale (assuming 5 activities per minute is high engagement)
  return Math.min(activityPerMinute / 5, 1.0);
}

/**
 * Get mode configuration
 * @param {string} mode - Room mode
 * @returns {Object} Mode configuration
 */
export function getModeConfig(mode) {
  const configs = {
    [ROOM_MODES.STUDY]: {
      label: 'Study Mode',
      icon: '📚',
      description: 'Optimized for focused learning and studying',
      features: {
        noiseSuppression: true,
        autoFraming: true,
        chat: true,
        games: false,
        virtualBrowser: true,
        screenShare: true,
        transcription: true
      },
      uiConfig: {
        showTimer: true,
        showBreakReminder: true,
        quietMode: true,
        layout: 'focused'
      }
    },
    [ROOM_MODES.MEETING]: {
      label: 'Meeting Mode',
      icon: '💼',
      description: 'Professional mode for team meetings and presentations',
      features: {
        noiseSuppression: true,
        autoFraming: true,
        chat: true,
        games: false,
        virtualBrowser: true,
        screenShare: true,
        transcription: true,
        summary: true
      },
      uiConfig: {
        showAgenda: true,
        showTimer: true,
        professionalLayout: true,
        layout: 'grid'
      }
    },
    [ROOM_MODES.CASUAL]: {
      label: 'Casual Mode',
      icon: '🎉',
      description: 'Relaxed mode for hanging out with friends',
      features: {
        noiseSuppression: false,
        autoFraming: false,
        chat: true,
        games: true,
        virtualBrowser: true,
        screenShare: true,
        transcription: false
      },
      uiConfig: {
        funEffects: true,
        relaxedLayout: true,
        layout: 'dynamic'
      }
    },
    [ROOM_MODES.GAMING]: {
      label: 'Gaming Mode',
      icon: '🎮',
      description: 'Optimized for gaming sessions',
      features: {
        noiseSuppression: true,
        autoFraming: false,
        chat: true,
        games: true,
        virtualBrowser: false,
        screenShare: true,
        transcription: false
      },
      uiConfig: {
        lowLatency: true,
        gameOverlay: true,
        layout: 'game-focused'
      }
    }
  };

  return configs[mode] || configs[ROOM_MODES.CASUAL];
}

export default {
  classifyRoom,
  analyzeActivity,
  getModeConfig,
  ROOM_MODES
};
