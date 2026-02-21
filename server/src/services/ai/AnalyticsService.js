import logger from '../../logger.js';
import { Transcript } from '../../models/Transcript.js';
import eventLogger from '../EventLogger.js';

/**
 * AI Analytics Service
 * Tracks usage, engagement, and generates insights
 */

export class AnalyticsService {
  /**
   * Track granular user activity
   * @param {Object} activity - Activity data
   */
  async trackActivity(activity) {
    try {
      const { userId, type, roomId, metadata, duration, timestamp } = activity;
      
      // Use EventLogger to persist the activity
      // Map 'type' to specific EventLogger methods or use a generic one if available
      // Since EventLogger handles specific types, we can assume 'type' maps to known events or just log as a generic room event if possible.
      // However, the socket handler is passing generic 'activity' types.
      // For now, let's log it as a generic RoomEvent if it has a roomId, or just strict logging if needed.
      
      // If roomId is present, use logRoomEvent
      if (roomId) {
        await eventLogger.logRoomEvent(roomId, userId, type, { 
           ...metadata, 
           duration,
           originalTimestamp: timestamp 
        });
      } else {
        // If no roomId (platform level activity), we might need a different model or just skip room-specific logging
        // For now, let's log debug info as we don't have a generic "UserActivity" model separate from RoomEvent yet.
        // Or we could create a placeholder room ID for system events if needed.
        logger.debug(`[AnalyticsService] Tracked non-room activity: ${type} for ${userId}`);
      }
      
      return true;
    } catch (error) {
       logger.error('[AnalyticsService] Track activity failed:', error);
       return false;
    }
  }

  /**
   * Get room session analytics
  async getRoomAnalytics(roomId) {
    try {
      const analytics = {
        roomId,
        timestamp: new Date().toISOString(),
        metrics: {}
      };

      // Get transcripts for this room
      const transcripts = await Transcript.find({ roomId }).sort({ timestamp: 1 });

      // Calculate engagement metrics
      analytics.metrics.transcription = {
        totalTranscripts: transcripts.length,
        totalWords: this.countWords(transcripts),
        averageWordsPerMinute: this.calculateWPM(transcripts),
        speakers: this.getUniqueSpeakers(transcripts),
        speakerDistribution: this.getSpeakerDistribution(transcripts)
      };

      // Get moderation metrics
      const moderatedTranscripts = transcripts.filter(t => t.moderated);
      analytics.metrics.moderation = {
        totalViolations: moderatedTranscripts.length,
        violationRate: (moderatedTranscripts.length / transcripts.length) * 100 || 0,
        bySeverity: this.groupBySeverity(moderatedTranscripts)
      };

      // Calculate session duration
      if (transcripts.length > 0) {
        const firstTranscript = transcripts[0];
        const lastTranscript = transcripts[transcripts.length - 1];
        const duration = new Date(lastTranscript.timestamp) - new Date(firstTranscript.timestamp);
        analytics.metrics.duration = {
          milliseconds: duration,
          minutes: Math.round(duration / 60000),
          hours: Math.round(duration / 3600000 * 10) / 10
        };
      }

      return analytics;

    } catch (error) {
      logger.error('[AnalyticsService] Error getting room analytics:', error);
      return {
        error: error.message
      };
    }
  }

  /**
   * Generate user engagement report
   * @param {string} userId - User ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} User engagement report
   */
  async getUserEngagement(userId, startDate, endDate) {
    try {
      const transcripts = await Transcript.find({
        userId,
        timestamp: { $gte: startDate, $lte: endDate }
      });

      const engagement = {
        userId,
        period: {
          start: startDate,
          end: endDate
        },
        metrics: {
          totalSessions: new Set(transcripts.map(t => t.roomId)).size,
          totalContributions: transcripts.length,
          totalWords: this.countWords(transcripts),
          averageContributionLength: this.countWords(transcripts) / transcripts.length || 0,
          mostActiveDay: this.getMostActiveDay(transcripts),
          mostActiveHour: this.getMostActiveHour(transcripts)
        }
      };

      return engagement;

    } catch (error) {
      logger.error('[AnalyticsService] Error getting user engagement:', error);
      return { error: error.message };
    }
  }

  /**
   * Generate platform-wide insights
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Platform insights
   */
  async getPlatformInsights(startDate, endDate) {
    try {
      const transcripts = await Transcript.find({
        timestamp: { $gte: startDate, $lte: endDate }
      });

      const insights = {
        period: {
          start: startDate,
          end: endDate
        },
        overview: {
          totalRooms: new Set(transcripts.map(t => t.roomId)).size,
          totalUsers: new Set(transcripts.map(t => t.userId)).size,
          totalTranscripts: transcripts.length,
          totalWords: this.countWords(transcripts)
        },
        engagement: {
          averageRoomDuration: await this.getAverageRoomDuration(transcripts),
          averageParticipantsPerRoom: await this.getAverageParticipants(transcripts),
          peakUsageHours: this.getPeakHours(transcripts),
          peakUsageDays: this.getPeakDays(transcripts)
        },
        moderation: {
          totalViolations: transcripts.filter(t => t.moderated).length,
          violationRate: (transcripts.filter(t => t.moderated).length / transcripts.length) * 100 || 0,
          topViolationTypes: this.getTopViolationTypes(transcripts)
        },
        trends: {
          dailyActiveUsers: this.getDailyActiveUsers(transcripts),
          dailyTranscripts: this.getDailyTranscripts(transcripts)
        }
      };

      return insights;

    } catch (error) {
      logger.error('[AnalyticsService] Error getting platform insights:', error);
      return { error: error.message };
    }
  }

  /**
   * Generate feature usage report
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Feature usage report
   */
  async getFeatureUsage(startDate, endDate) {
    try {
      // This would query event logs from MongoDB
      const events = await eventLogger.getEvents({
        timestamp: { $gte: startDate, $lte: endDate }
      });

      const usage = {
        period: { start: startDate, end: endDate },
        features: {
          transcription: events.filter(e => e.eventType === 'transcript').length,
          screenShare: events.filter(e => e.eventType === 'share').length,
          chat: events.filter(e => e.eventType === 'chat').length,
          games: events.filter(e => e.eventType === 'game').length,
          virtualBrowser: events.filter(e => e.eventType === 'browser').length
        },
        mostUsedFeature: this.getMostUsedFeature(events),
        leastUsedFeature: this.getLeastUsedFeature(events)
      };

      return usage;

    } catch (error) {
      logger.error('[AnalyticsService] Error getting feature usage:', error);
      return { error: error.message };
    }
  }

  // Helper methods

  countWords(transcripts) {
    return transcripts.reduce((total, t) => {
      return total + (t.text?.split(/\s+/).length || 0);
    }, 0);
  }

  calculateWPM(transcripts) {
    if (transcripts.length < 2) return 0;
    
    const totalWords = this.countWords(transcripts);
    const firstTime = new Date(transcripts[0].timestamp);
    const lastTime = new Date(transcripts[transcripts.length - 1].timestamp);
    const durationMinutes = (lastTime - firstTime) / 60000;
    
    return durationMinutes > 0 ? Math.round(totalWords / durationMinutes) : 0;
  }

  getUniqueSpeakers(transcripts) {
    return [...new Set(transcripts.map(t => t.userId))];
  }

  getSpeakerDistribution(transcripts) {
    const distribution = {};
    for (const transcript of transcripts) {
      const speaker = transcript.userName || transcript.userId;
      distribution[speaker] = (distribution[speaker] || 0) + 1;
    }
    return distribution;
  }

  groupBySeverity(transcripts) {
    const grouped = {};
    for (const transcript of transcripts) {
      const severity = transcript.moderationSeverity || 'unknown';
      grouped[severity] = (grouped[severity] || 0) + 1;
    }
    return grouped;
  }

  getMostActiveDay(transcripts) {
    const days = {};
    for (const transcript of transcripts) {
      const day = new Date(transcript.timestamp).toLocaleDateString();
      days[day] = (days[day] || 0) + 1;
    }
    const entries = Object.entries(days);
    if (entries.length === 0) return null;
    return entries.sort((a, b) => b[1] - a[1])[0][0];
  }

  getMostActiveHour(transcripts) {
    const hours = {};
    for (const transcript of transcripts) {
      const hour = new Date(transcript.timestamp).getHours();
      hours[hour] = (hours[hour] || 0) + 1;
    }
    const entries = Object.entries(hours);
    if (entries.length === 0) return null;
    return entries.sort((a, b) => b[1] - a[1])[0][0];
  }

  async getAverageRoomDuration(transcripts) {
    const roomDurations = {};
    for (const transcript of transcripts) {
      if (!roomDurations[transcript.roomId]) {
        roomDurations[transcript.roomId] = {
          first: transcript.timestamp,
          last: transcript.timestamp
        };
      } else {
        roomDurations[transcript.roomId].last = transcript.timestamp;
      }
    }

    const durations = Object.values(roomDurations).map(d => 
      new Date(d.last) - new Date(d.first)
    );

    const avgMs = durations.reduce((sum, d) => sum + d, 0) / durations.length || 0;
    return Math.round(avgMs / 60000); // Return in minutes
  }

  async getAverageParticipants(transcripts) {
    const roomParticipants = {};
    for (const transcript of transcripts) {
      if (!roomParticipants[transcript.roomId]) {
        roomParticipants[transcript.roomId] = new Set();
      }
      roomParticipants[transcript.roomId].add(transcript.userId);
    }

    const counts = Object.values(roomParticipants).map(set => set.size);
    return counts.reduce((sum, c) => sum + c, 0) / counts.length || 0;
  }

  getPeakHours(transcripts) {
    const hours = {};
    for (const transcript of transcripts) {
      const hour = new Date(transcript.timestamp).getHours();
      hours[hour] = (hours[hour] || 0) + 1;
    }
    return Object.entries(hours)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hour, count]) => ({ hour: parseInt(hour), count }));
  }

  getPeakDays(transcripts) {
    const days = {};
    for (const transcript of transcripts) {
      const day = new Date(transcript.timestamp).toLocaleDateString();
      days[day] = (days[day] || 0) + 1;
    }
    return Object.entries(days)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)
      .map(([day, count]) => ({ day, count }));
  }

  getTopViolationTypes(transcripts) {
    const types = {};
    for (const transcript of transcripts) {
      if (transcript.violations) {
        for (const violation of transcript.violations) {
          types[violation.type] = (types[violation.type] || 0) + 1;
        }
      }
    }
    return Object.entries(types)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }));
  }

  getDailyActiveUsers(transcripts) {
    const daily = {};
    for (const transcript of transcripts) {
      const day = new Date(transcript.timestamp).toLocaleDateString();
      if (!daily[day]) daily[day] = new Set();
      daily[day].add(transcript.userId);
    }
    return Object.entries(daily).map(([day, users]) => ({
      day,
      count: users.size
    }));
  }

  getDailyTranscripts(transcripts) {
    const daily = {};
    for (const transcript of transcripts) {
      const day = new Date(transcript.timestamp).toLocaleDateString();
      daily[day] = (daily[day] || 0) + 1;
    }
    return Object.entries(daily).map(([day, count]) => ({ day, count }));
  }

  getMostUsedFeature(events) {
    const features = {};
    for (const event of events) {
      features[event.eventType] = (features[event.eventType] || 0) + 1;
    }
    const entries = Object.entries(features);
    if (entries.length === 0) return null;
    return entries.sort((a, b) => b[1] - a[1])[0][0];
  }

  getLeastUsedFeature(events) {
    const features = {};
    for (const event of events) {
      features[event.eventType] = (features[event.eventType] || 0) + 1;
    }
    const entries = Object.entries(features);
    if (entries.length === 0) return null;
    return entries.sort((a, b) => a[1] - b[1])[0][0];
  }
}

export default new AnalyticsService();
