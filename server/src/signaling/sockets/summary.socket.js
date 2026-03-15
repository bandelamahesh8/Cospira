/**
 * Meeting Summary Socket Handlers
 * 
 * Handles real-time summary generation, action items, and decisions.
 */

import meetingSummarizerService from '../../api/services/MeetingSummarizerService.js';
import roomService from '../../api/services/RoomService.js';
import eventLogger from '../../api/services/EventLogger.js';
import logger from '../../shared/logger.js';

export default function registerSummaryHandlers(io, socket) {
  
  /**
   * Generate summary for current session
   */
  socket.on('summary:generate', async ({ roomId }, callback) => {
    try {
      const userId = socket.user?.id;
      if (!userId) {
        return callback?.({ success: false, error: 'Authentication required' });
      }

      // Get active session
      const session = await roomService.getActiveSession(roomId);
      if (!session) {
        return callback?.({ success: false, error: 'No active session' });
      }

      // Check if user is in the room
      const room = await roomService.getRoom(roomId);
      if (!room || !room.getMemberRole(userId)) {
        return callback?.({ success: false, error: 'Not a room member' });
      }

      // Generate summary
      const summary = await meetingSummarizerService.generateSessionSummary(
        roomId,
        session.sessionId
      );

      // Broadcast to room
      io.to(roomId).emit('summary:generated', {
        summaryId: summary._id,
        bullets: summary.bullets,
        actionItems: summary.actionItems,
        decisions: summary.decisions,
        generatedAt: summary.generatedAt
      });

      callback?.({
        success: true,
        summary: {
          summaryId: summary._id,
          bullets: summary.bullets,
          actionItems: summary.actionItems,
          decisions: summary.decisions
        }
      });

      logger.info(`[Summary] Generated for room ${roomId} by ${userId}`);
    } catch (error) {
      logger.error('[Summary] Generation failed', {
        roomId: socket.data?.roomId,
        error: error.message
      });
      callback?.({ success: false, error: 'Failed to generate summary' });
    }
  });

  /**
   * Request quick summary (for late joiners)
   */
  socket.on('summary:quick', async ({ roomId, minutes = 10 }, callback) => {
    try {
      const userId = socket.user?.id;
      if (!userId) {
        return callback?.({ success: false, error: 'Authentication required' });
      }

      // Check if user is in the room
      const room = await roomService.getRoom(roomId);
      if (!room || !room.getMemberRole(userId)) {
        return callback?.({ success: false, error: 'Not a room member' });
      }

      // Generate quick summary
      const summary = await meetingSummarizerService.generateQuickSummary(
        roomId,
        minutes
      );

      callback?.({
        success: true,
        summary: summary.summary,
        bullets: summary.bullets,
        duration: summary.duration
      });

      logger.info(`[Summary] Quick summary generated for ${userId} in ${roomId}`);
    } catch (error) {
      logger.error('[Summary] Quick summary failed', {
        roomId,
        error: error.message
      });
      callback?.({ success: false, error: 'Failed to generate summary' });
    }
  });

  /**
   * Get latest summary for room
   */
  socket.on('summary:get-latest', async ({ roomId }, callback) => {
    try {
      const userId = socket.user?.id;
      if (!userId) {
        return callback?.({ success: false, error: 'Authentication required' });
      }

      // Check if user is in the room
      const room = await roomService.getRoom(roomId);
      if (!room || !room.getMemberRole(userId)) {
        return callback?.({ success: false, error: 'Not a room member' });
      }

      const summary = await meetingSummarizerService.getLatestSummary(roomId);

      if (!summary) {
        return callback?.({ success: false, error: 'No summary found' });
      }

      callback?.({
        success: true,
        summary: {
          summaryId: summary._id,
          bullets: summary.bullets,
          actionItems: summary.actionItems,
          decisions: summary.decisions,
          generatedAt: summary.generatedAt,
          sessionId: summary.sessionId
        }
      });
    } catch (error) {
      logger.error('[Summary] Get latest failed', {
        roomId,
        error: error.message
      });
      callback?.({ success: false, error: 'Failed to get summary' });
    }
  });

  /**
   * Update action item status
   */
  socket.on('action:update-status', async ({ summaryId, actionId, status }, callback) => {
    try {
      const userId = socket.user?.id;
      if (!userId) {
        return callback?.({ success: false, error: 'Authentication required' });
      }

      // Update status
      const summary = await meetingSummarizerService.updateActionStatus(
        summaryId,
        actionId,
        status,
        userId
      );

      // Get room ID from summary
      const roomId = summary.roomId;

      // Broadcast update to room
      io.to(roomId).emit('action:status-updated', {
        summaryId,
        actionId,
        status,
        updatedBy: userId
      });

      // Log event
      await eventLogger.logActionUpdated(
        roomId,
        userId,
        actionId,
        'pending', // We don't track previous status in this simple version
        status
      );

      callback?.({ success: true });

      logger.info(`[Action] Status updated`, {
        summaryId,
        actionId,
        status,
        userId
      });
    } catch (error) {
      logger.error('[Action] Update status failed', {
        summaryId,
        actionId,
        error: error.message
      });
      callback?.({ success: false, error: error.message });
    }
  });

  /**
   * Create manual action item
   */
  socket.on('action:create', async ({ roomId, text, owner, priority = 'medium' }, callback) => {
    try {
      const userId = socket.user?.id;
      const userName = socket.user?.name;
      
      if (!userId) {
        return callback?.({ success: false, error: 'Authentication required' });
      }

      // Check if user is in the room
      const room = await roomService.getRoom(roomId);
      if (!room || !room.getMemberRole(userId)) {
        return callback?.({ success: false, error: 'Not a room member' });
      }

      // Get active session or latest summary
      const session = await roomService.getActiveSession(roomId);
      let summary;

      if (session) {
        // Try to get existing summary for this session
        const { MeetingSummary } = await import('../models/MeetingSummary.js');
        summary = await MeetingSummary.findBySession(session.sessionId);
        
        if (!summary) {
          // Create new summary for this session
          summary = new MeetingSummary({
            roomId,
            sessionId: session.sessionId,
            bullets: [],
            actionItems: [],
            decisions: [],
            generatedBy: 'manual',
            transcriptCount: 0,
            duration: 0,
            participantCount: session.participants.length
          });
        }
      } else {
        // No active session, get latest summary
        summary = await meetingSummarizerService.getLatestSummary(roomId);
        
        if (!summary) {
          return callback?.({ 
            success: false, 
            error: 'No active session or previous summary found' 
          });
        }
      }

      // Add action item
      const actionItem = {
        text,
        owner: owner || userId,
        ownerName: owner || userName,
        priority,
        status: 'pending',
        createdBy: userId,
        createdAt: new Date()
      };

      summary.actionItems.push(actionItem);
      await summary.save();

      const newAction = summary.actionItems[summary.actionItems.length - 1];

      // Broadcast to room
      io.to(roomId).emit('action:created', {
        summaryId: summary._id,
        action: newAction
      });

      // Log event
      await eventLogger.logActionCreated(
        roomId,
        userId,
        newAction._id.toString(),
        text,
        owner || userId
      );

      callback?.({
        success: true,
        action: newAction
      });

      logger.info(`[Action] Created manually`, {
        roomId,
        actionId: newAction._id,
        userId
      });
    } catch (error) {
      logger.error('[Action] Create failed', {
        roomId,
        error: error.message
      });
      callback?.({ success: false, error: 'Failed to create action' });
    }
  });

  /**
   * Vote on decision
   */
  socket.on('decision:vote', async ({ summaryId, decisionId, vote }, callback) => {
    try {
      const userId = socket.user?.id;
      const userName = socket.user?.name;
      
      if (!userId) {
        return callback?.({ success: false, error: 'Authentication required' });
      }

      if (!['yes', 'no', 'abstain'].includes(vote)) {
        return callback?.({ success: false, error: 'Invalid vote' });
      }

      // Record vote
      const summary = await meetingSummarizerService.voteOnDecision(
        summaryId,
        decisionId,
        userId,
        userName,
        vote
      );

      const roomId = summary.roomId;

      // Get vote results
      const results = summary.getDecisionResults(decisionId);

      // Broadcast to room
      io.to(roomId).emit('decision:vote-recorded', {
        summaryId,
        decisionId,
        userId,
        vote,
        results
      });

      callback?.({
        success: true,
        results
      });

      logger.info(`[Decision] Vote recorded`, {
        summaryId,
        decisionId,
        userId,
        vote
      });
    } catch (error) {
      logger.error('[Decision] Vote failed', {
        summaryId,
        decisionId,
        error: error.message
      });
      callback?.({ success: false, error: error.message });
    }
  });

  /**
   * Get user's pending actions across all rooms
   */
  socket.on('action:get-my-pending', async (callback) => {
    try {
      const userId = socket.user?.id;
      if (!userId) {
        return callback?.({ success: false, error: 'Authentication required' });
      }

      const actions = await meetingSummarizerService.getUserPendingActions(userId);

      callback?.({
        success: true,
        actions
      });
    } catch (error) {
      logger.error('[Action] Get pending failed', {
        userId: socket.user?.id,
        error: error.message
      });
      callback?.({ success: false, error: 'Failed to get actions' });
    }
  });

  logger.debug('[Summary] Handlers registered for socket');
}
