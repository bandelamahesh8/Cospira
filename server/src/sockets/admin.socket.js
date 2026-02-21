/**
 * Admin Socket Handlers - Phase 6
 * 
 * Secure handlers for high-level administration and intelligence.
 */

import adminIntelligenceService from '../services/AdminIntelligenceService.js';
import logger from '../logger.js';

const ADMIN_KEY = process.env.ADMIN_KEY || 'Mahesh@7648';

export default function registerAdminHandlers(io, socket) {
  
  /**
   * Get Platform Health & Intelligence
   */
  socket.on('admin:get-intelligence', async ({ adminKey }, callback) => {
    try {
      if (adminKey !== ADMIN_KEY) {
        return callback?.({ success: false, error: 'Unauthorized' });
      }

      const [health, anomalies] = await Promise.all([
        adminIntelligenceService.getHealthReport(),
        adminIntelligenceService.detectAnomalies()
      ]);

      callback?.({
        success: true,
        health,
        anomalies,
        timestamp: new Date()
      });
    } catch (error) {
      logger.error('[AdminSocket] Intelligence request failed:', error.message);
      callback?.({ success: false, error: error.message });
    }
  });

  /**
   * Get Deep Drop-off Analysis for a specific room
   */
  socket.on('admin:analyze-dropoff', async ({ roomId, adminKey }, callback) => {
    try {
      if (adminKey !== ADMIN_KEY) {
        return callback?.({ success: false, error: 'Unauthorized' });
      }

      const insights = await adminIntelligenceService.getDropOffInsights(roomId);
      callback?.({ success: true, insights });
    } catch (error) {
      callback?.({ success: false, error: error.message });
    }
  });

  /**
   * System Notification (Broadcast to ALL rooms)
   */
  socket.on('admin:broadcast-alert', async ({ message, severity, adminKey }, callback) => {
    try {
      if (adminKey !== ADMIN_KEY) {
        return callback?.({ success: false, error: 'Unauthorized' });
      }

      io.emit('system:alert', {
        message,
        severity, // info, warning, critical
        timestamp: new Date()
      });

      logger.info(`[Admin] Global broadcast: ${message}`);
      callback?.({ success: true });
    } catch (error) {
      callback?.({ success: false, error: error.message });
    }
  });
}
