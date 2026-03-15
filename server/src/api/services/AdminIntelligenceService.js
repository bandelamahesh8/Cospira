/**
 * Admin Intelligence Service - Phase 6
 * 
 * High-level business intelligence, security audits, and system health.
 */

import { RoomAnalytics } from '../models/RoomAnalytics.js';
import { DailyRoomStats } from '../models/DailyRoomStats.js';
import { Room } from '../models/Room.js';
import { Session } from '../models/Session.js';
import { RoomEvent } from '../models/RoomEvent.js';
import { WebRTCMetrics } from '../models/WebRTCMetrics.js';
import { AIModerationLog } from '../models/AIModerationLog.js';
import logger from '../../shared/logger.js';

class AdminIntelligenceService {
  /**
   * Comprehensive Platform Health Report
   */
  async getHealthReport() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [
        totalRooms, 
        activeRooms, 
        totalSessions,
        recentViolations,
        todayActivity
      ] = await Promise.all([
        Room.countDocuments(),
        Room.countDocuments({ isActive: true }),
        Session.countDocuments(),
        AIModerationLog.countDocuments({ timestamp: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } }),
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
        timestamp: new Date(),
        platform: {
          totalRooms,
          activeRooms,
          totalSessions,
          occupancyRate: totalRooms > 0 ? (activeRooms / totalRooms) * 100 : 0
        },
        safety: {
          violationsLast24h: recentViolations,
          status: recentViolations > 50 ? 'critical' : recentViolations > 10 ? 'warning' : 'healthy'
        },
        activity: {
          todayJoins: todayActivity[0]?.joins || 0,
          avgPeakToday: Math.round(todayActivity[0]?.avgPeak || 0)
        }
      };
    } catch (error) {
      logger.error('[AdminIntelligence] Health report failed:', error.message);
      throw error;
    }
  }

  /**
   * Analyze reasons for user drop-off
   */
  async getDropOffInsights(roomId) {
    try {
      const exits = await RoomEvent.find({
        roomId,
        type: 'leave',
        timestamp: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      });

      let qualityIssues = 0;
      let featureSpam = 0;

      for (const exit of exits) {
        // Check for quality issues 60s before exit
        const metrics = await WebRTCMetrics.findOne({
          roomId,
          userId: exit.userId,
          packetLoss: { $gt: 15 },
          timestamp: { $lt: exit.timestamp, $gt: new Date(exit.timestamp - 60000) }
        });
        if (metrics) qualityIssues++;

        // Check for rapid events (spam) before exit
        const recentEvents = await RoomEvent.countDocuments({
          roomId,
          timestamp: { $lt: exit.timestamp, $gt: new Date(exit.timestamp - 30000) }
        });
        if (recentEvents > 50) featureSpam++;
      }

      return {
        totalExits: exits.length,
        correlatedWithQuality: qualityIssues,
        correlatedWithSpam: featureSpam,
        recommendation: qualityIssues > exits.length / 2 ? 'Improve SFU routing for this region' : 'Check room moderation settings'
      };
    } catch (err) {
      return { error: 'Analysis failed' };
    }
  }

  /**
   * Detect anomalies across the platform
   */
  async detectAnomalies() {
    const anomalies = [];
    
    // 1. Join Spikes
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const joinCount = await RoomEvent.countDocuments({ type: 'join', timestamp: { $gt: fiveMinAgo } });
    if (joinCount > 100) {
      anomalies.push({ type: 'TRAFFIC_SPIKE', message: `${joinCount} joins in last 5 mins`, severity: 'high' });
    }

    // 2. High Violation Rate
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const violationCount = await AIModerationLog.countDocuments({ timestamp: { $gt: oneHourAgo } });
    if (violationCount > 20) {
      anomalies.push({ type: 'MODERATION_STORM', message: `${violationCount} violations in last hour`, severity: 'medium' });
    }

    return anomalies;
  }
}

export default new AdminIntelligenceService();
