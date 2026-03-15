/**
 * Timeline Socket Handlers
 * 
 * Handles room timeline, history, and pending items.
 * Phase 2: Room Memory
 */

import roomTimelineService from '../services/RoomTimelineService.js';
import roomService from '../services/RoomService.js';
import logger from '../../shared/logger.js';

export default function registerTimelineHandlers(io, socket) {
  
  /**
   * Get room timeline
   */
  socket.on('timeline:get', async ({ roomId, limit = 10 }, callback) => {
    try {
      const userId = socket.user?.id;
      if (!userId) {
        return callback?.({ success: false, error: 'Authentication required' });
      }

      // Check if user is a member
      const room = await roomService.getRoom(roomId);
      if (!room || !room.getMemberRole(userId)) {
        return callback?.({ success: false, error: 'Not a room member' });
      }

      const timeline = await roomTimelineService.getRoomTimeline(roomId, limit);

      callback?.({
        success: true,
        timeline
      });

      logger.info(`[Timeline] Timeline retrieved for room ${roomId} by ${userId}`);
    } catch (error) {
      logger.error('[Timeline] Get timeline failed', {
        roomId,
        error: error.message
      });
      callback?.({ success: false, error: 'Failed to get timeline' });
    }
  });

  /**
   * Get last session summary (auto-called on room join)
   */
  socket.on('timeline:get-last-summary', async ({ roomId }, callback) => {
    try {
      const userId = socket.user?.id;
      if (!userId) {
        return callback?.({ success: false, error: 'Authentication required' });
      }

      const room = await roomService.getRoom(roomId);
      if (!room || !room.getMemberRole(userId)) {
        return callback?.({ success: false, error: 'Not a room member' });
      }

      const lastSummary = await roomTimelineService.getLastSessionSummary(roomId);

      if (!lastSummary) {
        return callback?.({ success: false, error: 'No previous session found' });
      }

      callback?.({
        success: true,
        lastSummary
      });
    } catch (error) {
      logger.error('[Timeline] Get last summary failed', {
        roomId,
        error: error.message
      });
      callback?.({ success: false, error: 'Failed to get last summary' });
    }
  });

  /**
   * Get pending actions for room
   */
  socket.on('timeline:get-pending-actions', async ({ roomId, myActionsOnly = false }, callback) => {
    try {
      const userId = socket.user?.id;
      if (!userId) {
        return callback?.({ success: false, error: 'Authentication required' });
      }

      const room = await roomService.getRoom(roomId);
      if (!room || !room.getMemberRole(userId)) {
        return callback?.({ success: false, error: 'Not a room member' });
      }

      const actions = await roomTimelineService.getPendingActions(
        roomId,
        myActionsOnly ? userId : null
      );

      callback?.({
        success: true,
        actions,
        count: actions.length
      });
    } catch (error) {
      logger.error('[Timeline] Get pending actions failed', {
        roomId,
        error: error.message
      });
      callback?.({ success: false, error: 'Failed to get pending actions' });
    }
  });

  /**
   * Get pending decisions for room
   */
  socket.on('timeline:get-pending-decisions', async ({ roomId }, callback) => {
    try {
      const userId = socket.user?.id;
      if (!userId) {
        return callback?.({ success: false, error: 'Authentication required' });
      }

      const room = await roomService.getRoom(roomId);
      if (!room || !room.getMemberRole(userId)) {
        return callback?.({ success: false, error: 'Not a room member' });
      }

      const decisions = await roomTimelineService.getPendingDecisions(roomId);

      callback?.({
        success: true,
        decisions,
        count: decisions.length
      });
    } catch (error) {
      logger.error('[Timeline] Get pending decisions failed', {
        roomId,
        error: error.message
      });
      callback?.({ success: false, error: 'Failed to get pending decisions' });
    }
  });

  /**
   * Get room statistics
   */
  socket.on('timeline:get-stats', async ({ roomId }, callback) => {
    try {
      const userId = socket.user?.id;
      if (!userId) {
        return callback?.({ success: false, error: 'Authentication required' });
      }

      const room = await roomService.getRoom(roomId);
      if (!room || !room.getMemberRole(userId)) {
        return callback?.({ success: false, error: 'Not a room member' });
      }

      const stats = await roomTimelineService.getRoomStats(roomId);

      callback?.({
        success: true,
        stats
      });
    } catch (error) {
      logger.error('[Timeline] Get stats failed', {
        roomId,
        error: error.message
      });
      callback?.({ success: false, error: 'Failed to get stats' });
    }
  });

  /**
   * Get user's pending items (actions + unvoted decisions)
   */
  socket.on('timeline:get-my-pending', async ({ roomId }, callback) => {
    try {
      const userId = socket.user?.id;
      if (!userId) {
        return callback?.({ success: false, error: 'Authentication required' });
      }

      const room = await roomService.getRoom(roomId);
      if (!room || !room.getMemberRole(userId)) {
        return callback?.({ success: false, error: 'Not a room member' });
      }

      const pendingItems = await roomTimelineService.getUserPendingItems(roomId, userId);

      callback?.({
        success: true,
        ...pendingItems
      });
    } catch (error) {
      logger.error('[Timeline] Get my pending failed', {
        roomId,
        error: error.message
      });
      callback?.({ success: false, error: 'Failed to get pending items' });
    }
  });

  logger.debug('[Timeline] Handlers registered for socket');
}
