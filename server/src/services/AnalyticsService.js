/**
 * Analytics Service - Phase 6
 * 
 * Aggregates room and platform-wide data for admin insights.
 */

import { RoomAnalytics } from '../models/RoomAnalytics.js';
import { DailyRoomStats } from '../models/DailyRoomStats.js';
import { Room } from '../models/Room.js';
import { Session } from '../models/Session.js';
import { RoomEvent } from '../models/RoomEvent.js';
import logger from '../logger.js';

class AnalyticsService {
  /**
   * Get platform overview stats
   */
  async getOverviewStats() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [totalRooms, activeRooms, totalSessions, todayStats] = await Promise.all([
        Room.countDocuments(),
        Room.countDocuments({ isActive: true }),
        Session.countDocuments(),
        DailyRoomStats.aggregate([
          { $match: { date: { $gte: today } } },
          { $group: { 
              _id: null, 
              joins: { $sum: '$totalJoins' },
              avgPeak: { $avg: '$peakParticipants' }
          }}
        ])
      ]);

      return {
        totalRooms,
        activeRooms,
        totalSessions,
        todayJoins: todayStats[0]?.joins || 0,
        avgPeakToday: Math.round(todayStats[0]?.avgPeak || 0)
      };
    } catch (error) {
      logger.error('[AnalyticsService] Overview stats failed:', error.message);
      throw error;
    }
  }

  /**
   * Calculate return rate for a room
   * Percentage of unique users who have joined more than one session
   */
  async getRoomReturnRate(roomId) {
    try {
      const sessions = await Session.find({ roomId });
      const userJoinedCounts = {};

      sessions.forEach(session => {
        const uniqueParticipants = new Set(session.participants.map(p => p.userId));
        uniqueParticipants.forEach(userId => {
          userJoinedCounts[userId] = (userJoinedCounts[userId] || 0) + 1;
        });
      });

      const totalUsers = Object.keys(userJoinedCounts).length;
      if (totalUsers === 0) return 0;

      const repeatUsers = Object.values(userJoinedCounts).filter(count => count > 1).length;
      return (repeatUsers / totalUsers) * 100;
    } catch (error) {
      logger.error('[AnalyticsService] Return rate failed:', error.message);
      return 0;
    }
  }

  /**
   * Get feature adoption metrics
   * Analyzes what modes are being set in rooms
   */
  async getModeDistribution() {
    try {
      const rooms = await Room.find({}, 'intelligence.currentMode');
      const distribution = {
        meeting: 0,
        study: 0,
        casual: 0,
        gaming: 0,
        unknown: 0
      };

      rooms.forEach(room => {
        const mode = room.intelligence?.currentMode || 'unknown';
        if (distribution.hasOwnProperty(mode)) {
          distribution[mode]++;
        }
      });

      return distribution;
    } catch (error) {
      logger.error('[AnalyticsService] Mode distribution failed:', error.message);
      return {};
    }
  }

  /**
   * Record a quality metric for later correlation
   */
  async recordMetric(roomId, userId, metrics) {
    try {
      const { WebRTCMetrics } = await import('../models/WebRTCMetrics.js');
      await WebRTCMetrics.create({
        roomId,
        userId,
        ...metrics
      });
    } catch (error) {
      // Periodic metrics shouldn't crash or slow down
    }
  }
}

export default new AnalyticsService();
