import logger from '../../shared/logger.js';
import analyticsService from '../../api/services/ai/AnalyticsService.js';
import eventLogger from '../../api/services/EventLogger.js';
import { UserAnalyticsSetting } from '../../api/models/UserAnalyticsSetting.js';

/**
 * Register Analytics Socket Handlers
 * Provides real-time analytics and insights
 */
export default function registerAnalyticsHandlers(io, socket) {
  
  /**
   * Get room analytics
   */
  socket.on('get-room-analytics', async ({ roomId }, callback) => {
    try {
      if (!roomId) {
        return callback?.({ success: false, error: 'Room ID required' });
      }

      const analytics = await analyticsService.getRoomAnalytics(roomId);
      
      logger.info(`[Analytics] Room analytics requested for ${roomId}`);
      
      callback?.({
        success: true,
        analytics
      });

    } catch (error) {
      logger.error('[Analytics] Error getting room analytics:', error);
      callback?.({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * Get advanced AI insights for user
   */
  socket.on('get-user-ai-insights', async (payload, callback) => {
    try {
      if (typeof payload === 'function') {
        callback = payload;
        payload = {};
      }
      const userId = payload?.userId || socket.user?.id || socket.user?.sub;
      if (!userId) return callback?.({ success: false, error: 'Auth required' });

      const insights = await analyticsService.getUserAIInsights(userId);
      callback?.({ success: true, insights });
    } catch (error) {
      logger.error('[Analytics] Error getting AI insights:', error);
      callback?.({ success: false, error: error.message });
    }
  });

  /**
   * Get user engagement report
   */
  socket.on('get-user-engagement', async ({ userId, startDate, endDate }, callback) => {
    try {
      if (!userId) {
        return callback?.({ success: false, error: 'User ID required' });
      }

      const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Default: last 7 days
      const end = endDate ? new Date(endDate) : new Date();

      const engagement = await analyticsService.getUserEngagement(userId, start, end);
      
      logger.info(`[Analytics] User engagement requested for ${userId}`);
      
      callback?.({
        success: true,
        engagement
      });

    } catch (error) {
      logger.error('[Analytics] Error getting user engagement:', error);
      callback?.({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * Get platform insights (admin only)
   */
  socket.on('get-platform-insights', async ({ startDate, endDate, adminKey }, callback) => {
    try {
      // Admin authentication
      if (adminKey !== 'Mahesh@7648') {
        return callback?.({ success: false, error: 'Unauthorized' });
      }

      const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: last 30 days
      const end = endDate ? new Date(endDate) : new Date();

      const insights = await analyticsService.getPlatformInsights(start, end);
      
      logger.info('[Analytics] Platform insights requested');
      
      callback?.({
        success: true,
        insights
      });

    } catch (error) {
      logger.error('[Analytics] Error getting platform insights:', error);
      callback?.({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * Get feature usage report (admin only)
   */
  socket.on('get-feature-usage', async ({ startDate, endDate, adminKey }, callback) => {
    try {
      // Admin authentication
      if (adminKey !== 'Mahesh@7648') {
        return callback?.({ success: false, error: 'Unauthorized' });
      }

      const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();

      const usage = await analyticsService.getFeatureUsage(start, end);
      
      logger.info('[Analytics] Feature usage requested');
      
      callback?.({
        success: true,
        usage
      });

    } catch (error) {
      logger.error('[Analytics] Error getting feature usage:', error);
      callback?.({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * Generate weekly report (scheduled or on-demand)
   */
  socket.on('generate-weekly-report', async ({ adminKey }, callback) => {
    try {
      // Admin authentication
      if (adminKey !== 'Mahesh@7648') {
        return callback?.({ success: false, error: 'Unauthorized' });
      }

      const endDate = new Date();
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const [insights, usage] = await Promise.all([
        analyticsService.getPlatformInsights(startDate, endDate),
        analyticsService.getFeatureUsage(startDate, endDate)
      ]);

      const report = {
        period: {
          start: startDate,
          end: endDate,
          type: 'weekly'
        },
        summary: {
          totalRooms: insights.overview?.totalRooms || 0,
          totalUsers: insights.overview?.totalUsers || 0,
          totalTranscripts: insights.overview?.totalTranscripts || 0,
          averageRoomDuration: insights.engagement?.averageRoomDuration || 0,
          violationRate: insights.moderation?.violationRate || 0
        },
        insights,
        usage,
        generatedAt: new Date().toISOString()
      };

      logger.info('[Analytics] Weekly report generated');
      
      callback?.({
        success: true,
        report
      });

    } catch (error) {
      logger.error('[Analytics] Error generating weekly report:', error);
      callback?.({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * Get recent activity for the current user
   */
  socket.on('get-user-activity', async (payload = {}, callback) => {
    try {
      if (typeof payload === 'function') {
        callback = payload;
        payload = {};
      }
      const limit = payload?.limit || 20;
      const userId = payload?.userId || socket.user?.id || socket.user?.sub;
      console.log(`[Analytics] ${userId} is fetching activities (limit: ${limit})`);
      if (!userId) {
        console.warn(`[Analytics] Unauthenticated activity fetch attempted by ${socket.id}`);
        return callback?.({ success: false, error: 'Authentication required' });
      }

      const settings = await UserAnalyticsSetting.findOne({ userId }).lean();
      const afterDate = settings?.historyClearedAt || null;

      const events = await eventLogger.getUserGlobalActivity(userId, limit, afterDate);
      console.log(`[Analytics] Found ${events?.length || 0} events for user ${userId}`);
      
      const activities = [];
      const pairedIds = new Set();

      for (let i = 0; i < events.length; i++) {
        const event = events[i];
        if (pairedIds.has(event._id.toString())) continue;

        let title = 'Activity';
        let subtitle = 'Social Interaction';
        let type = 'social';
        let time = event.timestamp;
        let duration = event.metadata?.duration;
        let endTime = null;

        if (event.roomId && event.roomId !== 'global') {
          const roomInfo = await analyticsService.resolveRoomName(event.roomId, event.metadata?.roomName);
          const roomName = roomInfo.name;
          
          if (event.eventType === 'leave') {
            // Look ahead (chronologically backwards) for the corresponding join
            const joinEvent = events.slice(i + 1).find(e => 
              e.eventType === 'join' && 
              e.roomId === event.roomId && 
              !pairedIds.has(e._id.toString())
            );

            if (joinEvent) {
              pairedIds.add(joinEvent._id.toString());
              title = 'Joined Room';
              subtitle = `Sector: ${roomName}`;
              type = 'room';
              time = joinEvent.timestamp;
              endTime = event.timestamp;
              duration = duration || (new Date(event.timestamp) - new Date(joinEvent.timestamp)) / 1000;
            } else {
              title = 'Left Room';
              subtitle = `Sector: ${roomName}`;
              type = 'room';
            }
          } else {
            switch (event.eventType) {
              case 'join':
                title = 'Joined Room';
                subtitle = `Sector: ${roomName}`;
                type = 'room';
                break;
              case 'room_created':
                title = 'Created Room';
                subtitle = `Sector: ${roomName}`;
                type = 'room';
                break;
              case 'chat':
                title = 'New Message';
                subtitle = `Sent in ${roomName}`;
                type = 'social';
                break;
              case 'game_started':
                title = 'Played a Game';
                subtitle = `${event.metadata?.gameType || 'Match'} session started`;
                type = 'match';
                break;
              case 'global_connect':
                title = 'Joined Global Connect';
                subtitle = `Mode: ${event.metadata?.mode || 'video'}`;
                type = 'social';
                break;
              default:
                title = event.eventType.charAt(0).toUpperCase() + event.eventType.slice(1);
                subtitle = `Activity in ${roomName}`;
            }
          }
        } else {
          switch (event.eventType) {
            case 'game_started':
              title = 'Played a Game';
              subtitle = `${event.metadata?.gameType || 'Match'} session started`;
              type = 'match';
              break;
            case 'global_connect':
              title = 'Joined Global Connect';
              subtitle = `Mode: ${event.metadata?.mode || 'video'}`;
              type = 'social';
              break;
            case 'chat':
              title = 'New Message';
              subtitle = `Sent in ${event.metadata?.roomName || 'Room'}`;
              type = 'social';
              break;
            case 'action_created':
              title = 'Action Task Created';
              subtitle = event.metadata?.actionText || 'New task assigned';
              type = 'match';
              break;
            case 'poll_created':
              title = 'New Poll Started';
              subtitle = event.metadata?.question || 'User feedback requested';
              type = 'achievement';
              break;
            default:
              title = event.eventType.charAt(0).toUpperCase() + event.eventType.slice(1);
          }
        }

        activities.push({
          id: event._id.toString(),
          type,
          title,
          subtitle,
          time,
          duration,
          endTime,
          roomId: event.roomId
        });
      }

      callback?.({ success: true, activities });
    } catch (error) {
      logger.error('[Analytics] Error getting user activity:', error);
      callback?.({ success: false, error: error.message });
    }
  });

  /**
   * Batch activity logging from clients
   */
  socket.on('activity-batch', async (data, callback) => {
    try {
      const { events } = data;
      const userId = socket.user?.id;

      if (!userId || !events || !Array.isArray(events)) {
        return callback?.({ success: false, error: 'Invalid activity data' });
      }

      logger.info(`[Analytics] Received ${events.length} activity events from user ${userId}`);
      
      // Track each event in analytics system
      for (const event of events) {
        await analyticsService.trackActivity({
          userId,
          type: event.type,
          roomId: event.roomId,
          metadata: event.metadata,
          duration: event.duration,
          timestamp: event.timestamp || new Date()
        });
      }

      callback?.({ success: true });
    } catch (error) {
      logger.error('[Analytics] Error logging activity batch:', error);
      callback?.({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * Clear user's analytics history
   */
  socket.on('clear-user-history', async (callback) => {
    try {
      const userId = socket.user?.id || socket.user?.sub;
      if (!userId) return callback?.({ success: false, error: 'Auth required' });

      await UserAnalyticsSetting.findOneAndUpdate(
        { userId },
        { historyClearedAt: new Date() },
        { upsert: true, new: true }
      );

      logger.info(`[Analytics] User history cleared for ${userId}`);
      
      // Broadcast to specific user room to inform other tabs
      io.to(`user:${userId}`).emit('history-cleared');
      
      callback?.({ success: true });
    } catch (error) {
      logger.error('[Analytics] Error clearing user history:', error);
      callback?.({ success: false, error: error.message });
    }
  });

  logger.info('[Analytics] Handlers registered for socket:', socket.id);
}
