/**
 * Drop-Off Analyzer - Phase 6
 * 
 * Correlates user exits with system events (quality, feature usage).
 */

import { Session } from '../models/Session.js';
import { RoomEvent } from '../models/RoomEvent.js';
import { WebRTCMetrics } from '../models/WebRTCMetrics.js';
import logger from '../../shared/logger.js';

class DropOffAnalyzer {
  /**
   * Analyze correlation between high packet loss and user exits
   */
  async analyzeQualityExits(roomId, timeWindowMs = 60000) { // Default 1 min
    try {
      // 1. Get recent exits from RoomEvents
      const exits = await RoomEvent.find({
        roomId,
        type: 'leave',
        timestamp: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24h
      });

      let qualityCorrelatedExits = 0;

      for (const exit of exits) {
        // 2. Look for high packet loss leading up to this exit
        const badMetrics = await WebRTCMetrics.find({
          roomId,
          userId: exit.userId,
          packetLoss: { $gt: 15 }, // Over 15% is bad
          timestamp: { 
            $lt: exit.timestamp, 
            $gt: new Date(exit.timestamp.getTime() - timeWindowMs) 
          }
        });

        if (badMetrics.length > 0) {
          qualityCorrelatedExits++;
        }
      }

      const totalExits = exits.length;
      const correlationPercentage = totalExits > 0 ? (qualityCorrelatedExits / totalExits) * 100 : 0;

      return {
        totalExits,
        qualityCorrelatedExits,
        correlationPercentage: Math.round(correlationPercentage)
      };

    } catch (error) {
      logger.error('[DropOffAnalyzer] Quality correlation failed:', error.message);
      return { totalExits: 0, qualityCorrelatedExits: 0, correlationPercentage: 0 };
    }
  }

  /**
   * Identify features used right before a drop-off
   */
  async analyzeFeatureFriction(roomId) {
    try {
      const exits = await RoomEvent.find({
        roomId,
        type: 'leave',
        timestamp: { $gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
      });

      const precedingEventCounts = {};

      for (const exit of exits) {
        // Find last event for user before leaving
        const lastEvent = await RoomEvent.findOne({
          roomId,
          userId: exit.userId,
          timestamp: { $lt: exit.timestamp },
          type: { $ne: 'leave' }
        }).sort({ timestamp: -1 });

        if (lastEvent) {
          precedingEventCounts[lastEvent.type] = (precedingEventCounts[lastEvent.type] || 0) + 1;
        }
      }

      return precedingEventCounts;
    } catch (error) {
       logger.error('[DropOffAnalyzer] Feature friction analysis failed');
       return {};
    }
  }
}

export default new DropOffAnalyzer();
