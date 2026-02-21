# COSPIRA QUICK REFERENCE GUIDE

**Last Updated**: 2026-01-10
**Version**: Phases 0-2 Complete

---

## 🚀 QUICK START

### Server Status

```bash
# Check if server is running
curl https://localhost:3001/health

# Start development server
npm run dev

# Server runs on:
# - Client: https://localhost:8080
# - Server: https://localhost:3001 (HTTPS)
```

---

## 📊 DATABASE MODELS

### Room

```javascript
{
  roomId: String,           // Unique identifier
  name: String,             // Display name
  purpose: String,          // meeting|study|entertainment|general
  host: String,             // userId of host
  members: [{
    userId: String,
    role: String,           // host|member|guest
    joinedAt: Date,
    lastSeenAt: Date
  }],
  settings: {
    allowGuests: Boolean,
    requireApproval: Boolean,
    maxParticipants: Number,
    recordSessions: Boolean
  },
  isActive: Boolean,
  totalSessions: Number,
  totalDuration: Number,    // minutes
  totalParticipants: Number
}
```

### Session

```javascript
{
  sessionId: String,
  roomId: String,
  startedAt: Date,
  endedAt: Date,
  participants: [{
    userId: String,
    userName: String,
    joinedAt: Date,
    leftAt: Date,
    duration: Number        // minutes
  }],
  totalDuration: Number,
  peakParticipants: Number,
  summaryId: ObjectId,      // Link to MeetingSummary
  transcriptCount: Number,
  actionItemsCount: Number,
  decisionsCount: Number,
  quality: {
    avgLatency: Number,
    avgPacketLoss: Number,
    disconnections: Number
  }
}
```

### MeetingSummary

```javascript
{
  roomId: String,
  sessionId: String,
  bullets: [String],        // Key points (max 5)
  actionItems: [{
    text: String,
    owner: String,          // userId
    ownerName: String,
    status: String,         // pending|in_progress|completed|cancelled
    priority: String,       // low|medium|high
    dueDate: Date,
    createdBy: String,
    createdAt: Date,
    completedAt: Date
  }],
  decisions: [{
    decision: String,
    owner: String,
    ownerName: String,
    status: String,         // proposed|accepted|rejected|completed
    votes: [{
      userId: String,
      userName: String,
      vote: String,         // yes|no|abstain
      votedAt: Date
    }],
    createdBy: String,
    createdAt: Date
  }],
  generatedAt: Date,
  generatedBy: String,      // ai|manual|hybrid
  confidence: Number        // 0-1
}
```

---

## 🔌 REST API ENDPOINTS

### Rooms

```javascript
// List all active rooms
GET /api/rooms
Response: [{ id, name, createdAt, userCount, requiresPassword, ... }]

// Get room details
GET /api/rooms/:roomId
Response: { roomId, name, purpose, memberCount, settings, ... }

// Get user's rooms
GET /api/rooms/user/:userId
Response: { rooms: [{ roomId, name, userRole, isHost, ... }] }

// Update room settings (host only)
PATCH /api/rooms/:roomId
Body: { name, purpose, settings: { ... } }
Response: { success: true, room: { ... } }

// Archive room (host only)
DELETE /api/rooms/:roomId
Response: { success: true, message: 'Room archived' }

// Get room event history
GET /api/rooms/:roomId/events?limit=50&type=chat
Response: { success: true, events: [...] }

// Get room session history
GET /api/rooms/:roomId/sessions?limit=10
Response: { success: true, sessions: [...] }

// Get session details
GET /api/rooms/:roomId/sessions/:sessionId
Response: { success: true, session: { ... } }
```

---

## 🔌 SOCKET EVENTS

### Summary Events

```javascript
// Generate summary for current session
socket.emit('summary:generate', { roomId }, (response) => {
  // response.summary: { bullets, actionItems, decisions }
});

// Get quick summary (for late joiners)
socket.emit('summary:quick', { roomId, minutes: 10 }, (response) => {
  // response: { summary, bullets, duration }
});

// Get latest summary for room
socket.emit('summary:get-latest', { roomId }, (response) => {
  // response.summary: { summaryId, bullets, actionItems, decisions }
});

// Create action item
socket.emit(
  'action:create',
  {
    roomId,
    text: 'Review Q1 budget',
    owner: 'user-id',
    priority: 'high',
  },
  (response) => {
    // response.action: { actionId, text, owner, status, ... }
  }
);

// Update action status
socket.emit(
  'action:update-status',
  {
    summaryId: 'summary-id',
    actionId: 'action-id',
    status: 'completed',
  },
  (response) => {
    // response: { success: true }
  }
);

// Get my pending actions (all rooms)
socket.emit('action:get-my-pending', (response) => {
  // response.actions: [{ actionId, text, roomId, ... }]
});

// Vote on decision
socket.emit(
  'decision:vote',
  {
    summaryId: 'summary-id',
    decisionId: 'decision-id',
    vote: 'yes', // or 'no' or 'abstain'
  },
  (response) => {
    // response.results: { yes: 5, no: 2, abstain: 1, total: 8 }
  }
);
```

### Timeline Events

```javascript
// Get room timeline
socket.emit('timeline:get', { roomId, limit: 10 }, (response) => {
  // response.timeline: {
  //   roomId, roomName, totalSessions, totalDuration,
  //   timeline: [{ sessionId, startedAt, duration, participants, summary }]
  // }
});

// Get last session summary
socket.emit('timeline:get-last-summary', { roomId }, (response) => {
  // response.lastSummary: {
  //   sessionId, endedAt, duration,
  //   summary: { bullets, actionItems, decisions }
  // }
});

// Get pending actions for room
socket.emit(
  'timeline:get-pending-actions',
  {
    roomId,
    myActionsOnly: false,
  },
  (response) => {
    // response: { actions: [...], count: 5 }
  }
);

// Get pending decisions for room
socket.emit('timeline:get-pending-decisions', { roomId }, (response) => {
  // response: { decisions: [...], count: 3 }
});

// Get room statistics
socket.emit('timeline:get-stats', { roomId }, (response) => {
  // response.stats: {
  //   totalSessions, totalDuration, totalActions,
  //   completedActions, actionCompletionRate,
  //   totalDecisions, avgSessionDuration, ...
  // }
});

// Get my pending items (actions + unvoted decisions)
socket.emit('timeline:get-my-pending', { roomId }, (response) => {
  // response: {
  //   actions: [...], actionsCount: 2,
  //   decisions: [...], decisionsCount: 1,
  //   totalPending: 3
  // }
});
```

### Auto-Sent Events (Listen for these)

```javascript
// Sent when user joins room (if previous session exists)
socket.on('room:last-session-summary', (data) => {
  // data: { sessionId, endedAt, duration, bullets, actionItemsCount, decisionsCount }
  showBanner(`Last session: ${formatDate(data.endedAt)} - ${data.bullets.join(', ')}`);
});

// Sent when user joins room (if they have pending actions)
socket.on('room:pending-actions-reminder', (data) => {
  // data: { count, actions: [...] }
  showNotification(`You have ${data.count} pending actions`);
});

// Broadcast when summary is generated
socket.on('summary:generated', (data) => {
  // data: { summaryId, bullets, actionItems, decisions, generatedAt }
  updateUI(data);
});

// Broadcast when action is created
socket.on('action:created', (data) => {
  // data: { summaryId, action: { ... } }
  addActionToList(data.action);
});

// Broadcast when action status is updated
socket.on('action:status-updated', (data) => {
  // data: { summaryId, actionId, status, updatedBy }
  updateActionStatus(data.actionId, data.status);
});

// Broadcast when vote is recorded
socket.on('decision:vote-recorded', (data) => {
  // data: { summaryId, decisionId, userId, vote, results }
  updateVoteResults(data.decisionId, data.results);
});
```

---

## 🎯 COMMON USE CASES

### Use Case 1: Generate Summary at End of Meeting

```javascript
// Host clicks "End Meeting" button
socket.emit('summary:generate', { roomId }, (response) => {
  if (response.success) {
    displaySummary({
      bullets: response.summary.bullets,
      actions: response.summary.actionItems,
      decisions: response.summary.decisions,
    });
  }
});

// Summary is automatically generated when session ends
// (if duration > 2 minutes)
```

### Use Case 2: Late Joiner Catch-Up

```javascript
// User joins room
socket.emit('join-room', { roomId, user }, (response) => {
  if (response.success) {
    // Automatically receive room:last-session-summary
    // and room:pending-actions-reminder events
  }
});

// Or manually request quick summary
socket.emit('summary:quick', { roomId, minutes: 10 }, (response) => {
  showCatchUpBanner(response.summary, response.bullets);
});
```

### Use Case 3: Track Action Items

```javascript
// Create action during meeting
socket.emit('action:create', {
  roomId,
  text: 'Prepare Q2 presentation',
  owner: currentUserId,
  priority: 'high',
});

// Update status when done
socket.emit('action:update-status', {
  summaryId,
  actionId,
  status: 'completed',
});

// Check my pending actions
socket.emit('action:get-my-pending', (response) => {
  displayMyActions(response.actions);
});
```

### Use Case 4: Vote on Decisions

```javascript
// Vote on a decision
socket.emit(
  'decision:vote',
  {
    summaryId,
    decisionId,
    vote: 'yes',
  },
  (response) => {
    console.log('Vote results:', response.results);
    // { yes: 5, no: 2, abstain: 1, total: 8 }
  }
);

// Listen for other votes
socket.on('decision:vote-recorded', (data) => {
  updateVoteDisplay(data.decisionId, data.results);
});
```

### Use Case 5: View Room History

```javascript
// Get room timeline
socket.emit('timeline:get', { roomId, limit: 10 }, (response) => {
  const timeline = response.timeline.timeline;

  timeline.forEach((session) => {
    console.log(`Session ${session.sessionId}:`);
    console.log(`  Duration: ${session.duration} minutes`);
    console.log(`  Participants: ${session.participants.length}`);
    if (session.summary) {
      console.log(`  Key points: ${session.summary.bullets.join(', ')}`);
      console.log(`  Actions: ${session.summary.actionItemsCount}`);
    }
  });
});

// Get room statistics
socket.emit('timeline:get-stats', { roomId }, (response) => {
  console.log('Room Stats:', response.stats);
  // {
  //   totalSessions: 15,
  //   totalDuration: 450, // minutes
  //   actionCompletionRate: 75, // %
  //   avgSessionDuration: 30 // minutes
  // }
});
```

---

## 🔧 PERMISSION SYSTEM

### Roles and Permissions

```javascript
// Host permissions
const hostCan = [
  'kick_user',
  'mute_all',
  'unmute_all',
  'lock_room',
  'unlock_room',
  'end_room',
  'change_settings',
  'promote_user',
  'demote_user',
  'delete_message',
  'create_poll',
  'close_poll',
  // + all member permissions
];

// Member permissions
const memberCan = [
  'speak',
  'chat',
  'react',
  'share_screen',
  'share_audio',
  'create_action',
  'update_own_action',
  'create_decision',
  'update_own_decision',
  'vote_poll',
  'use_virtual_browser',
];

// Guest permissions
const guestCan = ['speak', 'chat', 'react', 'view_content', 'vote_poll'];
```

### Check Permissions (Server-Side)

```javascript
import { checkUserPermission } from '../middleware/permissions.js';

const room = await roomService.getRoom(roomId);
const canKick = checkUserPermission(room, userId, 'kick_user');

if (!canKick) {
  return socket.emit('error', 'Permission denied');
}
```

---

## 📊 SUCCESS METRICS

### Track These Metrics

```javascript
// Get room stats
socket.emit('timeline:get-stats', { roomId }, (response) => {
  const metrics = {
    // Phase 1 metrics
    meetingsWithDecisions: response.stats.totalDecisions > 0,
    actionCompletionRate: response.stats.actionCompletionRate,

    // Phase 2 metrics
    returnRate: calculateReturnRate(response.stats.totalSessions),
    avgSessionDuration: response.stats.avgSessionDuration,
  };
});
```

---

## 🐛 DEBUGGING

### Check Server Logs

```javascript
// Server logs all events with logger.info/error
// Check console for:
// [RoomService] ...
// [MeetingSummarizer] ...
// [RoomTimeline] ...
// [Summary] ...
// [Timeline] ...
```

### Common Issues

```javascript
// Issue: Summary not generating
// Solution: Check if session duration > 2 minutes

// Issue: Permission denied
// Solution: Check user role in room

// Issue: No previous session found
// Solution: Room has no completed sessions yet

// Issue: Action not updating
// Solution: Verify summaryId and actionId are correct
```

---

## 🚀 DEPLOYMENT CHECKLIST

### Before Production

- [ ] Set up email service for summaries
- [ ] Add rate limiting on summary generation
- [ ] Add caching for timeline queries
- [ ] Set up background job for transcript aggregation
- [ ] Configure monitoring and alerts
- [ ] Run load tests
- [ ] Set up backup strategy for MongoDB
- [ ] Configure production environment variables
- [ ] Set up SSL certificates
- [ ] Configure CORS for production domain

---

## 📚 DOCUMENTATION LINKS

- **Product Roadmap**: `.agent/PRODUCT_ROADMAP.md`
- **Phase 0 Progress**: `.agent/PHASE_0_PROGRESS.md`
- **Phase 1 Progress**: `.agent/PHASE_1_PROGRESS.md`
- **Phase 2 Implementation**: `.agent/PHASE_2_IMPLEMENTATION.md`
- **Implementation Summary**: `.agent/IMPLEMENTATION_SUMMARY.md`
- **Phase 0 Workflow**: `.agent/workflows/phase-0-foundations.md`

---

## 🎯 NEXT STEPS

1. **Complete Phase 1-2 Enhancements**:
   - Email service integration
   - Auto-detect late joins in socket handler
   - UI components for summaries

2. **Phase 3: Smart Rooms**:
   - Integrate room classifier
   - Build dynamic UI rules engine
   - Implement purpose-based features

3. **Phase 4: Quality & Trust**:
   - Add noise suppression
   - Implement presence detection
   - Optional camera framing

---

**Server Status**: ✅ Running on port 3001 (HTTPS)

**All systems operational!** 🚀
