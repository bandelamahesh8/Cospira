/**
 * Room Intelligence Service - Phase 3: Smart Rooms
 * 
 * Analyzes room activity (transcripts, events) to dynamically
 * update room modes and UI configurations.
 */

import { Room } from '../models/Room.js';
import { Transcript } from '../models/Transcript.js';
import roomClassifier, { ROOM_MODES } from './ai/RoomClassifier.js';
import { analyzeSentiment } from './ai/SentimentAnalyzer.js';
import logger from '../../shared/logger.js';

class RoomIntelligenceService {
  constructor() {
    this.analysisIntervals = new Map(); // roomId -> interval
  }

  /**
   * Perform comprehensive analysis on a room
   * @param {string} roomId - Room to analyze
   * @returns {Promise<Object>} Analysis result
   */
  async analyzeRoom(roomId) {
    try {
      const room = await Room.findByRoomId(roomId);
      if (!room) {
        // Silent early return for transient or deleted rooms
        logger.debug(`[RoomIntelligence] Analysis skipped: Room document not found for ${roomId}`);
        return { success: false, error: 'Room document not found' };
      }

      // ... existing logic ...
      // Fetch last 50 transcripts for vibe analysis
      const transcripts = await Transcript.find({ roomId })
        .sort({ timestamp: -1 })
        .limit(50);

      // Perform activity analysis
      const activityAnalysis = roomClassifier.analyzeActivity({
        transcripts: transcripts.reverse(),
        duration: room.totalDuration || 0
      });

      // SENTIMENT ANALYSIS: Check overall vibe
      // Combine last 10 transcripts for rapid sentiment check
      const recentText = transcripts.slice(0, 10).map(t => t.text).join(' ');
      const sentiment = analyzeSentiment(recentText);
      
      // Heuristic: If highly negative/frustrated in a meeting, maybe suggest a break (Casual mode)?
      // Heuristic: If highly positive/fun, ensure it's Casual or Gaming?

      // Perform classification
      const classification = roomClassifier.classifyRoom({
        name: room.name,
        description: room.purpose // Use purpose as temporary description
      });

      let optimalMode = classification.mode;
      let confidence = classification.confidence;

      if (activityAnalysis.activityType !== 'unknown' && activityAnalysis.engagement > 0.5) {
         // ... activity map logic
         const activityMap = {
          professional: ROOM_MODES.MEETING,
          educational: ROOM_MODES.STUDY,
          casual: ROOM_MODES.CASUAL,
          collaborative: ROOM_MODES.MEETING
        };

        const suggestedMode = activityMap[activityAnalysis.activityType];
        if (suggestedMode && suggestedMode !== optimalMode) {
          optimalMode = suggestedMode;
          confidence = (confidence + activityAnalysis.engagement) / 2;
        }
      }

      // Sentiment Influence
      // If sentiment is extremely negative (argument/confusion) during a meeting -> Suggest Casual (cool down)
      // This is a subtle "AI Intervention" feature
      if (sentiment.score < -0.6 && optimalMode === ROOM_MODES.MEETING) {
           // We don't force switch, but we might hint at it?
           // For now, let's lower confidence in 'Meeting' if everyone is angry
           confidence -= 0.2;
      }
      
      // Update room model if mode has changed or auto-mode is enabled
      const modeChanged = room.intelligence.currentMode !== optimalMode;
      
      if (room.intelligence.autoModeEnabled) {
        room.intelligence.currentMode = optimalMode;
        room.intelligence.confidence = confidence;
        room.intelligence.lastClassifiedAt = new Date();
        room.intelligence.activityType = activityAnalysis.activityType;
        room.intelligence.sentiment = sentiment; // Save sentiment
        await room.save();
      }

      const modeConfig = roomClassifier.getModeConfig(optimalMode);

      return {
        success: true,
        roomId,
        currentMode: optimalMode,
        modeConfig,
        confidence,
        activityType: activityAnalysis.activityType,
        sentiment,
        modeChanged
      };
    } catch (error) {
      logger.error('[RoomIntelligence] Analysis execution error', { roomId, error: error.message });
      throw error;
    }
  }

  // ... rest of the file

  /**
   * Start periodic auto-analysis for an active room
   * @param {Object} io - Socket.io instance
   * @param {string} roomId - Room to track
   */
  startAutoAnalysis(roomId) {
    if (this.analysisIntervals.has(roomId)) return;

    logger.debug(`[RoomIntelligence] Starting auto-analysis for room ${roomId}`);
    
    const interval = setInterval(async () => {
      try {
        const result = await this.analyzeRoom(roomId);
        if (result && result.error === 'Room document not found') {
            logger.debug(`[RoomIntelligence] Stopping auto-analysis for ${roomId}: No DB document found.`);
            this.stopAutoAnalysis(roomId);
        }
      } catch (err) {
        logger.error(`[RoomIntelligence] Background analysis failed for room ${roomId}:`, err);
      }
    }, 30000); // Analyze every 30s

    this.analysisIntervals.set(roomId, interval);
  }

  /**
   * Stop auto-analysis for a room
   * @param {string} roomId - Room to stop tracking
   */
  stopAutoAnalysis(roomId) {
    if (this.analysisIntervals.has(roomId)) {
      clearInterval(this.analysisIntervals.get(roomId));
      this.analysisIntervals.delete(roomId);
      logger.info(`[RoomIntelligence] Stopped auto-analysis for room: ${roomId}`);
    }
  }

  /**
   * Manually set room mode (overrides auto-mode)
   * @param {string} roomId - Room ID
   * @param {string} mode - New mode
   */
  async setRoomMode(roomId, mode) {
    const room = await Room.findByRoomId(roomId);
    if (!room) throw new Error('Room not found');

    if (!Object.values(ROOM_MODES).includes(mode)) {
      throw new Error(`Invalid mode: ${mode}`);
    }

    room.intelligence.currentMode = mode;
    room.intelligence.autoModeEnabled = false; // Disable auto-mode when manually set
    room.intelligence.lastClassifiedAt = new Date();
    await room.save();

    return roomClassifier.getModeConfig(mode);
  }

  /**
   * Enable auto-mode for a room
   * @param {string} roomId - Room ID
   */
  async enableAutoMode(roomId) {
    const room = await Room.findByRoomId(roomId);
    if (!room) throw new Error('Room not found');

    room.intelligence.autoModeEnabled = true;
    await room.save();
    
    // Trigger immediate analysis
    return this.analyzeRoom(roomId);
  }
}

export default new RoomIntelligenceService();
