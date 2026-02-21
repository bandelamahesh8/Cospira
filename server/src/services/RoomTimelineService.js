/**
 * Room Timeline Service
 * 
 * Provides room history, session timeline, and pending actions.
 * This is Phase 2: Room Memory - making rooms feel alive and continuous.
 */

import { Session } from '../models/Session.js';
import { MeetingSummary } from '../models/MeetingSummary.js';
import { Room } from '../models/Room.js';
import logger from '../logger.js';

class RoomTimelineService {
  /**
   * Get complete timeline for a room
   * @param {string} roomId - Room ID
   * @param {number} limit - Max sessions to return
   * @returns {Promise<object>} Timeline data
   */
  async getRoomTimeline(roomId, limit = 10) {
    try {
      const room = await Room.findByRoomId(roomId);
      if (!room) {
        throw new Error('Room not found');
      }

      // Get sessions with summaries
      const sessions = await Session.find({ roomId, isActive: false })
        .sort({ startedAt: -1 })
        .limit(limit)
        .populate('summaryId');

      const timeline = sessions.map(session => ({
        sessionId: session.sessionId,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        duration: session.totalDuration,
        participants: session.participants.map(p => ({
          userId: p.userId,
          userName: p.userName,
          duration: p.duration
        })),
        summary: session.summaryId ? {
          bullets: session.summaryId.bullets,
          actionItemsCount: session.summaryId.actionItems.length,
          decisionsCount: session.summaryId.decisions.length
        } : null
      }));

      return {
        roomId,
        roomName: room.name,
        totalSessions: room.totalSessions,
        totalDuration: room.totalDuration,
        lastActive: room.lastActiveAt,
        timeline
      };
    } catch (error) {
      logger.error('[RoomTimeline] Failed to get timeline', {
        roomId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get last session summary for a room
   * @param {string} roomId - Room ID
   * @returns {Promise<object|null>} Last session summary
   */
  async getLastSessionSummary(roomId) {
    try {
      const lastSession = await Session.findOne({ roomId, isActive: false })
        .sort({ endedAt: -1 })
        .populate('summaryId');

      if (!lastSession || !lastSession.summaryId) {
        return null;
      }

      return {
        sessionId: lastSession.sessionId,
        endedAt: lastSession.endedAt,
        duration: lastSession.totalDuration,
        participantCount: lastSession.participants.length,
        summary: {
          bullets: lastSession.summaryId.bullets,
          actionItems: lastSession.summaryId.actionItems,
          decisions: lastSession.summaryId.decisions
        }
      };
    } catch (error) {
      logger.error('[RoomTimeline] Failed to get last summary', {
        roomId,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Get pending actions from previous sessions
   * @param {string} roomId - Room ID
   * @param {string} userId - User ID (optional, filter by user)
   * @returns {Promise<Array>} Pending actions
   */
  async getPendingActions(roomId, userId = null) {
    try {
      const query = { roomId };
      if (userId) {
        query['actionItems.owner'] = userId;
      }

      const summaries = await MeetingSummary.find(query)
        .sort({ createdAt: -1 })
        .limit(5);

      const pendingActions = [];

      summaries.forEach(summary => {
        summary.actionItems.forEach(item => {
          if (item.status === 'pending' || item.status === 'in_progress') {
            if (!userId || item.owner === userId) {
              pendingActions.push({
                actionId: item._id,
                summaryId: summary._id,
                text: item.text,
                owner: item.owner,
                ownerName: item.ownerName,
                status: item.status,
                priority: item.priority,
                dueDate: item.dueDate,
                createdAt: item.createdAt,
                sessionId: summary.sessionId,
                sessionDate: summary.createdAt
              });
            }
          }
        });
      });

      return pendingActions;
    } catch (error) {
      logger.error('[RoomTimeline] Failed to get pending actions', {
        roomId,
        userId,
        error: error.message
      });
      return [];
    }
  }

  /**
   * Get room statistics
   * @param {string} roomId - Room ID
   * @returns {Promise<object>} Room stats
   */
  async getRoomStats(roomId) {
    try {
      const room = await Room.findByRoomId(roomId);
      if (!room) {
        throw new Error('Room not found');
      }

      const sessions = await Session.find({ roomId, isActive: false });
      const summaries = await MeetingSummary.find({ roomId });

      const totalActions = summaries.reduce((sum, s) => sum + s.actionItems.length, 0);
      const completedActions = summaries.reduce((sum, s) => 
        sum + s.actionItems.filter(a => a.status === 'completed').length, 0
      );
      const totalDecisions = summaries.reduce((sum, s) => sum + s.decisions.length, 0);
      const acceptedDecisions = summaries.reduce((sum, s) =>
        sum + s.decisions.filter(d => d.status === 'accepted').length, 0
      );

      return {
        totalSessions: room.totalSessions,
        totalDuration: room.totalDuration,
        totalParticipants: room.totalParticipants,
        totalActions,
        completedActions,
        pendingActions: totalActions - completedActions,
        actionCompletionRate: totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 0,
        totalDecisions,
        acceptedDecisions,
        decisionAcceptanceRate: totalDecisions > 0 ? Math.round((acceptedDecisions / totalDecisions) * 100) : 0,
        avgSessionDuration: sessions.length > 0 
          ? Math.round(sessions.reduce((sum, s) => sum + s.totalDuration, 0) / sessions.length) 
          : 0,
        avgParticipantsPerSession: sessions.length > 0
          ? Math.round(sessions.reduce((sum, s) => sum + s.participants.length, 0) / sessions.length)
          : 0
      };
    } catch (error) {
      logger.error('[RoomTimeline] Failed to get stats', {
        roomId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get pending decisions for a room
   * @param {string} roomId - Room ID
   * @returns {Promise<Array>} Pending decisions
   */
  async getPendingDecisions(roomId) {
    try {
      const summaries = await MeetingSummary.find({ roomId })
        .sort({ createdAt: -1 })
        .limit(5);

      const pendingDecisions = [];

      summaries.forEach(summary => {
        summary.decisions.forEach(decision => {
          if (decision.status === 'proposed') {
            pendingDecisions.push({
              decisionId: decision._id,
              summaryId: summary._id,
              decision: decision.decision,
              owner: decision.owner,
              ownerName: decision.ownerName,
              status: decision.status,
              votes: decision.votes,
              voteCount: decision.votes.length,
              createdAt: decision.createdAt,
              sessionId: summary.sessionId,
              sessionDate: summary.createdAt
            });
          }
        });
      });

      return pendingDecisions;
    } catch (error) {
      logger.error('[RoomTimeline] Failed to get pending decisions', {
        roomId,
        error: error.message
      });
      return [];
    }
  }

  /**
   * Check if user has pending items in room
   * @param {string} roomId - Room ID
   * @param {string} userId - User ID
   * @returns {Promise<object>} Pending items summary
   */
  async getUserPendingItems(roomId, userId) {
    try {
      const [pendingActions, pendingDecisions] = await Promise.all([
        this.getPendingActions(roomId, userId),
        this.getPendingDecisions(roomId)
      ]);

      // Filter decisions user hasn't voted on
      const unvotedDecisions = pendingDecisions.filter(d => 
        !d.votes.some(v => v.userId === userId)
      );

      return {
        actions: pendingActions,
        actionsCount: pendingActions.length,
        decisions: unvotedDecisions,
        decisionsCount: unvotedDecisions.length,
        totalPending: pendingActions.length + unvotedDecisions.length
      };
    } catch (error) {
      logger.error('[RoomTimeline] Failed to get user pending items', {
        roomId,
        userId,
        error: error.message
      });
      return {
        actions: [],
        actionsCount: 0,
        decisions: [],
        decisionsCount: 0,
        totalPending: 0
      };
    }
  }
}

export default new RoomTimelineService();
