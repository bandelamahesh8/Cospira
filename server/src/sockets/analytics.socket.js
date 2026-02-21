import logger from '../logger.js';
import analyticsService from '../services/ai/AnalyticsService.js';

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

  logger.info('[Analytics] Handlers registered for socket:', socket.id);
}
