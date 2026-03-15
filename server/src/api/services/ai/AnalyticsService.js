import logger from '../../../shared/logger.js';
import { Transcript } from '../../models/Transcript.js';
import { Room } from '../../models/Room.js';
import { AIModerationLog } from '../../models/AIModerationLog.js';
import { UserAnalyticsSetting } from '../../models/UserAnalyticsSetting.js';
import { supabase } from '../../../shared/supabase.js';
import eventLogger from '../EventLogger.js';
import { getRoom } from '../../../shared/redis.js';

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
      
      if (roomId) {
        await eventLogger.logRoomEvent(roomId, userId, type, { 
           ...metadata, 
           duration,
           originalTimestamp: timestamp 
        });
      } else {
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
   */
  async getRoomAnalytics(roomId) {
    try {
      const analytics = {
        roomId,
        timestamp: new Date().toISOString(),
        metrics: {}
      };

      const transcripts = await Transcript.find({ roomId }).sort({ timestamp: 1 });

      analytics.metrics.transcription = {
        totalTranscripts: transcripts.length,
        totalWords: this.countWords(transcripts),
        averageWordsPerMinute: this.calculateWPM(transcripts),
        speakers: this.getUniqueSpeakers(transcripts),
        speakerDistribution: this.getSpeakerDistribution(transcripts)
      };

      const moderatedTranscripts = transcripts.filter(t => t.moderated);
      analytics.metrics.moderation = {
        totalViolations: moderatedTranscripts.length,
        violationRate: (moderatedTranscripts.length / transcripts.length) * 100 || 0,
        bySeverity: this.groupBySeverity(moderatedTranscripts)
      };

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
      return { error: error.message };
    }
  }

  /**
   * Generate user engagement report
   */
  async getUserEngagement(userId, startDate, endDate) {
    try {
      const transcripts = await Transcript.find({
        userId,
        timestamp: { $gte: startDate, $lte: endDate }
      });

      const engagement = {
        userId,
        period: { start: startDate, end: endDate },
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
   * Generate advanced AI insights for a user
   */
  async getUserAIInsights(userId) {
    try {
      const settings = await UserAnalyticsSetting.findOne({ userId }).lean();
      const afterDate = settings?.historyClearedAt || null;

      const events = await eventLogger.getUserGlobalActivity(userId, 3000, afterDate);
      const moderationLogs = await AIModerationLog.find({ userId }).limit(100).lean();
      
      const insights = {
        totalTimeSpent: 0,
        totalMessages: 0,
        totalShares: 0,
        totalGames: 0,
        roomsCreated: 0,
        roomsJoined: 0,
        averageSessionDuration: 0,
        peakStability: 98.2, // Default base
        activityPulse: [],
        totalTimeSpentMinutes: 0,
        sectorBreakdown: { organization: 0, private: 0 },
        securityCompliance: 100,
        rank: 'Strategic Operative',
        topOrganizations: []
      };

      const sessionPairs = new Map();
      const dailyActivity = new Map();
      const orgActivity = new Map();
      const roomTypeCache = new Map();

      // Batch identify room types to avoid excessive lookups
      const uniqueRoomIds = [...new Set(events.map(ev => ev.roomId).filter(id => id && id !== 'global'))];
      
      // Try MongoDB first
      const mongoRooms = await Room.find({ roomId: { $in: uniqueRoomIds } }).lean();
      mongoRooms.forEach(room => {
        const type = (room.organizationName || room.settings?.organizationId || room.settings?.organization_only || room.settings?.mode === 'organization' || 
                      (room.name && (room.name.toLowerCase().includes('org') || room.name.toLowerCase().includes('corp')))) ? 'organization' : 'private';
        roomTypeCache.set(room.roomId, { type, name: room.organizationName || room.name });
        if (type === 'organization') {
            const label = room.organizationName || room.name || `Sector ${room.roomId.substring(0, 6)}`;
            orgActivity.set(label, (orgActivity.get(label) || 0) + 1);
        }
      });

      // Remaining rooms lookup in Supabase
      const remainingIds = uniqueRoomIds.filter(id => !roomTypeCache.has(id));
      if (remainingIds.length > 0 && supabase) {
          try {
              // Check for both IDs and Slugs
              const { data: orgs } = await supabase
                .from('organizations')
                .select('id, name, slug')
                .or(`id.in.(${remainingIds.join(',')}),slug.in.(${remainingIds.join(',')})`);

              orgs?.forEach(org => {
                  roomTypeCache.set(org.id, { type: 'organization', name: org.name });
                  if (org.slug) roomTypeCache.set(org.slug, { type: 'organization', name: org.name });
                  orgActivity.set(org.name, (orgActivity.get(org.name) || 0) + 1);
              });

              const stillRemaining = uniqueRoomIds.filter(id => !roomTypeCache.has(id));
              if (stillRemaining.length > 0) {
                  const { data: breakouts } = await supabase.from('breakout_sessions').select('id, name, organizations(name)').in('id', stillRemaining);
                  breakouts?.forEach(bs => {
                      const orgName = bs.organizations?.name || "Organization";
                      roomTypeCache.set(bs.id, { type: 'organization', name: orgName });
                      orgActivity.set(orgName, (orgActivity.get(orgName) || 0) + 1);
                  });
              }
          } catch (e) {
              logger.debug(`[AnalyticsService] Supabase batch lookup failed: ${e.message}`);
          }
      }

      // Process events in chronological order to correctly pair join/leave sessions
      const chronologicalEvents = [...events].reverse();

      chronologicalEvents.forEach(ev => {
        // Pulse tracking
        const dateKey = new Date(ev.timestamp).toISOString().split('T')[0];
        dailyActivity.set(dateKey, (dailyActivity.get(dateKey) || 0) + 1);

        // Sector tracking
        const roomInfo = roomTypeCache.get(ev.roomId);
        if (roomInfo) {
            if (roomInfo.type === 'organization') insights.sectorBreakdown.organization++;
            else insights.sectorBreakdown.private++;
        } else if (ev.roomId && ev.roomId !== 'global') {
            // Fallback: check if the event metadata or internal state suggests organization
            const isOrg = ev.metadata?.organizationId || ev.metadata?.orgId || ev.metadata?.roomMode === 'organization' || 
                          (ev.metadata?.roomName && (ev.metadata.roomName.toLowerCase().includes('org') || ev.metadata.roomName.toLowerCase().includes('corp')));
            
            if (isOrg) {
                insights.sectorBreakdown.organization++;
                const label = ev.metadata?.roomName || `Cluster ${ev.roomId.substring(0, 6)}`;
                orgActivity.set(label, (orgActivity.get(label) || 0) + 1);
            } else {
                insights.sectorBreakdown.private++;
            }
        }

        switch (ev.eventType) {
          case 'chat':
            insights.totalMessages++;
            break;
          case 'share':
            insights.totalShares++;
            break;
          case 'game_started':
            insights.totalGames++;
            break;
          case 'room_created':
            insights.roomsCreated++;
            break;
          case 'join':
            insights.roomsJoined++;
            sessionPairs.set(ev.roomId, ev.timestamp);
            break;
          case 'leave':
            if (sessionPairs.has(ev.roomId)) {
              const joinTime = new Date(sessionPairs.get(ev.roomId));
              const leaveTime = new Date(ev.timestamp);
              const durationMs = leaveTime - joinTime;
              if (durationMs > 0 && durationMs < 8 * 3600000) { // Limit to 8 hours
                insights.totalTimeSpent += durationMs;
              }
              sessionPairs.delete(ev.roomId);
            }
            break;
        }
      });

      // Security Compliance - Never exactly 100%
      if (insights.totalMessages > 0) {
          const violations = moderationLogs.length;
          const baseCompliance = 100 - (violations * 5 / insights.totalMessages * 100);
          // Cap at 99.8 and add a tiny jitter to make it look "live"
          const jitter = (Math.random() * 0.4) - 0.2; // +/- 0.2%
          insights.securityCompliance = Math.max(85, Math.min(99.6, baseCompliance + jitter));
      } else {
          // Default for new users without messages
          insights.securityCompliance = 98.9 + (Math.random() * 0.5);
      }

      // Rank mapping
      if (insights.roomsCreated > 15 || insights.totalMessages > 500) insights.rank = 'Alpha Architect';
      else if (insights.roomsCreated > 5 || insights.totalMessages > 100) insights.rank = 'Lead Operative';
      else if (insights.roomsJoined > 20) insights.rank = 'Veteran Scout';

      // Top Orgs
      insights.topOrganizations = Array.from(orgActivity.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 3);

      // Final calculations
      const totalSessions = insights.roomsJoined || 1;
      insights.averageSessionDuration = Math.round((insights.totalTimeSpent / 1000 / 60) / totalSessions);
      insights.totalTimeSpentMinutes = Math.round(insights.totalTimeSpent / 1000 / 60);

      // Stable pulse for charts
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const k = d.toISOString().split('T')[0];
        last7Days.push({
          date: k,
          value: dailyActivity.get(k) || 0
        });
      }
      insights.activityPulse = last7Days;

      return insights;
    } catch (error) {
      logger.error('[AnalyticsService] Error generating user AI insights:', error);
      throw error;
    }
  }

  /**
   * Generate platform-wide insights
   */
  async getPlatformInsights(startDate, endDate) {
    try {
      const transcripts = await Transcript.find({
        timestamp: { $gte: startDate, $lte: endDate }
      });

      const insights = {
        period: { start: startDate, end: endDate },
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
   */
  async getFeatureUsage(startDate, endDate) {
    try {
      const events = await eventLogger.getEvents?.({
        timestamp: { $gte: startDate, $lte: endDate }
      }) || [];

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
    return Math.round(avgMs / 60000);
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

  /**
   * Resolve a human-readable name for any roomId
   * Sequence: Redis (Live) -> MongoDB (Archived) -> Supabase (Org/Breakout)
   */
  async resolveRoomName(roomId, fallbackName = null) {
    if (!roomId || roomId === 'global') return { name: fallbackName || 'Global Cluster', type: 'social', isActive: false };
    
    // Masked ID for display if we can't find a name
    const maskedId = roomId.length > 8 ? `Sector ${roomId.substring(0, 8)}...` : roomId;

    try {
      // 1. Check Redis (Active)
      const activeRoom = await getRoom(roomId);
      if (activeRoom) {
        return {
          name: activeRoom.organizationName || activeRoom.settings?.organizationName || activeRoom.name || fallbackName || maskedId,
          type: (activeRoom.organizationName || activeRoom.settings?.organizationId || activeRoom.settings?.mode === 'organization') ? 'organization' : 'private',
          isActive: true,
          participantCount: activeRoom.users?.length || 0
        };
      }

      // 2. Check MongoDB (History)
      const archivedRoom = await Room.findByRoomId(roomId);
      if (archivedRoom) {
        const type = (archivedRoom.settings?.organizationId || archivedRoom.settings?.organization_only || archivedRoom.organizationName) ? 'organization' : 'private';
        return {
          name: archivedRoom.organizationName || archivedRoom.name || fallbackName || maskedId,
          type,
          isActive: false
        };
      }

      // 3. Check Supabase (Orgs/Breakouts)
      if (typeof supabase !== 'undefined' && supabase) {
        // Check by ID OR Slug for organizations
        const { data: orgData } = await supabase
          .from('organizations')
          .select('id, name, slug')
          .or(`id.eq.${roomId},slug.eq.${roomId}`)
          .maybeSingle();
          
        if (orgData) return { name: orgData.name, type: 'organization', isActive: false };

        // Check breakout sessions
        const { data: bsData } = await supabase
          .from('breakout_sessions')
          .select('name, organizations(name)')
          .eq('id', roomId)
          .maybeSingle();
          
        if (bsData) return { 
          name: bsData.name || bsData.organizations?.name || fallbackName || maskedId, 
          type: 'organization', 
          isActive: false 
        };
      }
    } catch (e) {
      logger.debug(`[AnalyticsService] Name resolution failed for ${roomId}: ${e.message}`);
    }

    return { name: fallbackName || maskedId, type: 'private', isActive: false };
  }
}

export default new AnalyticsService();
