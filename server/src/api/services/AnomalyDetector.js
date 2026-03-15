/**
 * Anomaly Detector - Phase 6
 * 
 * Detects unusual spikes in activity or suspicious behavior.
 */

import { RoomEvent } from '../models/RoomEvent.js';
import { Session } from '../models/Session.js';
import logger from '../../shared/logger.js';

class AnomalyDetector {
  /**
   * Check for spike in room joins (Potential bot attack or viral load)
   */
  async detectJoinSpikes(threshold = 50, windowMs = 5 * 60 * 1000) { // 50 joins in 5 mins
    try {
      const now = new Date();
      const startTime = new Date(now.getTime() - windowMs);

      const joinCount = await RoomEvent.countDocuments({
        type: 'join',
        timestamp: { $gte: startTime }
      });

      if (joinCount > threshold) {
        const severity = joinCount > threshold * 3 ? 'critical' : 'warning';
        logger.warn(`[Anomaly] Join spike detected: ${joinCount} joins in ${windowMs / 1000}s`);
        
        // Save to AI Memory
        const { default: aiMemoryService } = await import('./ai/AIMemoryService.js');
        await aiMemoryService.saveMemory({
            roomId: 'system', // Global anomaly
            eventType: 'anomaly',
            content: { 
                message: `Join spike detected: ${joinCount} joins`,
                count: joinCount,
                severity 
            },
            importance: severity === 'critical' ? 5 : 4,
            tags: ['security', 'anomaly', 'join_spike']
        });

        return {
          anomaly: true,
          type: 'join_spike',
          count: joinCount,
          severity
        };
      }

      return { anomaly: false };
    } catch (error) {
      logger.error('[AnomalyDetector] Join spike detection failed');
      return { anomaly: false };
    }
  }

  /**
   * Detect "Zombie Rooms" (Many joins/leaves but no meaningful duration/transcript)
   */
  async detectZombieRooms() {
    try {
      const recentSessions = await Session.find({
        isActive: false,
        endTime: { $gt: new Date(Date.now() - 6 * 60 * 60 * 1000) } // Last 6h
      });

      const zombies = recentSessions.filter(s => {
        const duration = (s.endTime - s.startTime) / 1000;
        return duration < 30 && s.participants.length > 2; // Short but crowded
      });

      return zombies.map(s => ({
        roomId: s.roomId,
        sessionId: s._id,
        duration: (s.endTime - s.startTime) / 1000,
        participants: s.participants.length
      }));
    } catch (error) {
      return [];
    }
  }

  /**
   * Detect Geoghraphic Spikes (Mock/Placeholder logic)
   * In production, this would use IP metadata.
   */
  async detectGeoSpikes() {
    // Logic: Look for sudden shift in IP prefixes or ASN origins
    // Placeholder returning empty unless specific triggers hit
    return [];
  }
}

export default new AnomalyDetector();
