# PHASE 2 IMPLEMENTATION - ROOM MEMORY

**Goal**: Make rooms feel alive and continuous, not disposable.

---

## 🎯 PHASE 2 OBJECTIVES

1. **Room Timeline** - Show history of all sessions
2. **Auto-Load Last Summary** - When rejoining, see what happened last time
3. **Pending Actions Reminder** - Alert users about incomplete tasks

---

## TASK 1: Room Timeline Service

Create a service that provides room history and timeline.

**File**: `server/src/services/RoomTimelineService.js`

```javascript
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

      const timeline = sessions.map((session) => ({
        sessionId: session.sessionId,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        duration: session.totalDuration,
        participants: session.participants.map((p) => ({
          userId: p.userId,
          userName: p.userName,
          duration: p.duration,
        })),
        summary: session.summaryId
          ? {
              bullets: session.summaryId.bullets,
              actionItemsCount: session.summaryId.actionItems.length,
              decisionsCount: session.summaryId.decisions.length,
            }
          : null,
      }));

      return {
        roomId,
        roomName: room.name,
        totalSessions: room.totalSessions,
        totalDuration: room.totalDuration,
        lastActive: room.lastActiveAt,
        timeline,
      };
    } catch (error) {
      logger.error('[RoomTimeline] Failed to get timeline', {
        roomId,
        error: error.message,
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
        summary: {
          bullets: lastSession.summaryId.bullets,
          actionItems: lastSession.summaryId.actionItems,
          decisions: lastSession.summaryId.decisions,
        },
      };
    } catch (error) {
      logger.error('[RoomTimeline] Failed to get last summary', {
        roomId,
        error: error.message,
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

      const summaries = await MeetingSummary.find(query).sort({ createdAt: -1 }).limit(5);

      const pendingActions = [];

      summaries.forEach((summary) => {
        summary.actionItems.forEach((item) => {
          if (item.status === 'pending' || item.status === 'in_progress') {
            if (!userId || item.owner === userId) {
              pendingActions.push({
                actionId: item._id,
                text: item.text,
                owner: item.owner,
                ownerName: item.ownerName,
                status: item.status,
                priority: item.priority,
                dueDate: item.dueDate,
                createdAt: item.createdAt,
                sessionId: summary.sessionId,
                sessionDate: summary.createdAt,
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
        error: error.message,
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
      const completedActions = summaries.reduce(
        (sum, s) => sum + s.actionItems.filter((a) => a.status === 'completed').length,
        0
      );
      const totalDecisions = summaries.reduce((sum, s) => sum + s.decisions.length, 0);

      return {
        totalSessions: room.totalSessions,
        totalDuration: room.totalDuration,
        totalParticipants: room.totalParticipants,
        totalActions,
        completedActions,
        actionCompletionRate: totalActions > 0 ? (completedActions / totalActions) * 100 : 0,
        totalDecisions,
        avgSessionDuration:
          sessions.length > 0
            ? sessions.reduce((sum, s) => sum + s.totalDuration, 0) / sessions.length
            : 0,
      };
    } catch (error) {
      logger.error('[RoomTimeline] Failed to get stats', {
        roomId,
        error: error.message,
      });
      throw error;
    }
  }
}

export default new RoomTimelineService();
```

---

## TASK 2: Socket Events for Room Memory

**File**: `server/src/sockets/timeline.socket.js`

```javascript
import roomTimelineService from '../services/RoomTimelineService.js';
import roomService from '../services/RoomService.js';
import logger from '../logger.js';

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
        timeline,
      });
    } catch (error) {
      logger.error('[Timeline] Get timeline failed', {
        roomId,
        error: error.message,
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
        lastSummary,
      });
    } catch (error) {
      logger.error('[Timeline] Get last summary failed', {
        roomId,
        error: error.message,
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
        count: actions.length,
      });
    } catch (error) {
      logger.error('[Timeline] Get pending actions failed', {
        roomId,
        error: error.message,
      });
      callback?.({ success: false, error: 'Failed to get pending actions' });
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
        stats,
      });
    } catch (error) {
      logger.error('[Timeline] Get stats failed', {
        roomId,
        error: error.message,
      });
      callback?.({ success: false, error: 'Failed to get stats' });
    }
  });

  logger.debug('[Timeline] Handlers registered for socket');
}
```

---

## TASK 3: Auto-Send Last Summary on Room Join

**File**: `server/src/sockets/rooms.socket.js` (UPDATE)

Add this after successful room join (around line 350):

```javascript
// AUTO-SEND LAST SESSION SUMMARY (Phase 2: Room Memory)
// Send previous session summary to help users catch up
try {
  const { default: roomTimelineService } = await import('../services/RoomTimelineService.js');

  const lastSummary = await roomTimelineService.getLastSessionSummary(roomId);
  if (lastSummary) {
    socket.emit('room:last-session-summary', {
      sessionId: lastSummary.sessionId,
      endedAt: lastSummary.endedAt,
      duration: lastSummary.duration,
      bullets: lastSummary.summary.bullets,
      actionItemsCount: lastSummary.summary.actionItems.length,
      decisionsCount: lastSummary.summary.decisions.length,
    });
  }

  // Also send pending actions for this user
  const pendingActions = await roomTimelineService.getPendingActions(roomId, user.id);
  if (pendingActions.length > 0) {
    socket.emit('room:pending-actions-reminder', {
      count: pendingActions.length,
      actions: pendingActions.slice(0, 3), // Top 3 only
    });
  }
} catch (error) {
  logger.error('[RoomJoin] Failed to send room memory', { error: error.message });
}
```

---

## TASK 4: Register Timeline Handlers

**File**: `server/src/sockets/index.js` (UPDATE)

Add import:

```javascript
import registerTimelineHandlers from './timeline.socket.js';
```

Add registration:

```javascript
registerTimelineHandlers(io, socket);
```

---

## EXPECTED OUTCOMES

### Example 1: Weekly room opens → shows last week's decisions

**Flow**:

1. User joins room
2. Server auto-sends `room:last-session-summary` event
3. Client shows banner: "Last session: Jan 3 - Discussed Q1 budget, 3 decisions made"
4. User clicks to expand full summary

### Example 2: "2 actions from last meeting still pending"

**Flow**:

1. User joins room
2. Server checks pending actions for this user
3. Server sends `room:pending-actions-reminder` event
4. Client shows notification: "You have 2 pending actions from previous sessions"
5. User clicks to view and update status

---

## SUCCESS METRICS

- **Return rate per room**: Track how many users come back
- **Action completion rate**: % of actions marked complete
- **Time to first action**: How quickly users engage with pending items

---

## CLIENT-SIDE INTEGRATION (Example)

```javascript
// Listen for last session summary
socket.on('room:last-session-summary', (data) => {
  showBanner({
    title: 'Last Session',
    message: `${formatDate(data.endedAt)} - ${data.bullets.join(', ')}`,
    actions: [{ label: 'View Full Summary', onClick: () => showSummary(data) }],
  });
});

// Listen for pending actions reminder
socket.on('room:pending-actions-reminder', (data) => {
  showNotification({
    title: 'Pending Actions',
    message: `You have ${data.count} pending action items`,
    actions: data.actions,
    onClick: () => showActionsPanel(),
  });
});
```

---

**This completes Phase 2 implementation guide. Ready to code!**
