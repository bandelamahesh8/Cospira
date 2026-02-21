---
description: Phase 0 - Hard Foundations Implementation
---

# PHASE 0: HARD FOUNDATIONS

**Priority**: 🔴 CRITICAL - Must complete before any other phase
**Timeline**: Week 1-2
**Status**: 🟢 80% Complete (Pending Validation)

---

## OVERVIEW

Build the foundational data models and systems that everything else depends on. If this isn't solid, stop everything.

---

## TASK 1: Create Persistent Room Model

**Status**: ✅ COMPLETE

### Implementation

1. **Create Room Model**
   - File: `server/src/models/Room.js`
   - Purpose: Rooms become entities, not temporary calls
   - Features: Persistent identity, ownership, permissions, settings

2. **Database Schema**

```javascript
{
  roomId: String (unique, indexed),
  name: String,
  purpose: String (enum: meeting, study, entertainment, general),
  createdAt: Date,
  createdBy: String (userId),
  lastActiveAt: Date,
  isActive: Boolean,

  // Permissions
  host: String (userId),
  members: [{
    userId: String,
    role: String (enum: host, member, guest),
    joinedAt: Date,
    lastSeenAt: Date
  }],

  // Settings
  settings: {
    allowGuests: Boolean (default: true),
    requireApproval: Boolean (default: false),
    maxParticipants: Number (default: 50),
    recordSessions: Boolean (default: false)
  },

  // Metadata
  totalSessions: Number (default: 0),
  totalDuration: Number (minutes, default: 0),
  totalParticipants: Number (unique, default: 0)
}
```

3. **Update Room Creation Logic**
   - File: `server/src/sockets/rooms.socket.js`
   - On `createRoom`: Create Room document in MongoDB
   - On `joinRoom`: Add user to members array
   - On `leaveRoom`: Update lastSeenAt
   - On room empty: Set isActive = false (don't delete)

4. **Add Room Persistence API**
   - `GET /api/rooms/:roomId` - Get room details
   - `GET /api/rooms/user/:userId` - Get user's rooms
   - `PATCH /api/rooms/:roomId` - Update room settings (host only)
   - `DELETE /api/rooms/:roomId` - Archive room (host only)

### Acceptance Criteria

- [ ] Room persists after all users leave
- [ ] Room can be rejoined using same roomId
- [ ] Host is correctly assigned and persisted
- [ ] Members list is accurate and updated in real-time

---

## TASK 2: Complete Event Logging

**Status**: ✅ COMPLETE

### Current State

✅ Basic events: join, leave, mute, unmute, share, stop_share, chat
❌ Missing: speak, action, decision, poll events

### Implementation

1. **Update RoomEvent Model**
   - File: `server/src/models/RoomEvent.js`
   - Add new event types to enum

2. **New Event Types**

```javascript
enum: [
  // Existing
  'join',
  'leave',
  'mute',
  'unmute',
  'share',
  'stop_share',
  'chat',

  // New
  'speak', // User spoke (with duration)
  'action_created', // Action item created
  'action_updated', // Action item status changed
  'action_completed', // Action item completed
  'decision_made', // Decision recorded
  'decision_updated', // Decision status changed
  'poll_created', // Poll created
  'poll_voted', // User voted on poll
  'poll_closed', // Poll closed
  'room_locked', // Room locked by host
  'room_unlocked', // Room unlocked
  'user_kicked', // User kicked by host
  'user_promoted', // User promoted to member/host
  'settings_changed', // Room settings changed
];
```

3. **Add Metadata Schemas**

```javascript
metadata: {
  // For 'speak' events
  duration: Number (seconds),

  // For 'action_*' events
  actionId: String,
  actionText: String,
  owner: String (userId),
  status: String,

  // For 'decision_*' events
  decisionId: String,
  decisionText: String,

  // For 'poll_*' events
  pollId: String,
  question: String,
  options: [String],
  vote: String,

  // For 'user_kicked' events
  kickedBy: String (userId),
  reason: String,

  // Generic
  previousValue: Mixed,
  newValue: Mixed
}
```

4. **Integrate Event Logging**
   - Update all socket handlers to log events
   - Add helper function: `logRoomEvent(roomId, userId, eventType, metadata)`

### Acceptance Criteria

- [ ] All user actions are logged
- [ ] Events include relevant metadata
- [ ] Events are queryable by room and time range
- [ ] Event log is complete and accurate

---

## TASK 3: Implement Permission System

**Status**: ✅ COMPLETE

### Implementation

1. **Create Permission Middleware**
   - File: `server/src/middleware/permissions.js`
   - Export: `checkPermission(requiredPermission)`

2. **Define Permission Roles**

```javascript
const PERMISSIONS = {
  host: [
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
  ],
  member: [
    'speak',
    'chat',
    'share_screen',
    'share_audio',
    'create_action',
    'update_own_action',
    'vote_poll',
    'react',
  ],
  guest: [
    'speak', // Can be disabled in settings
    'chat', // Can be disabled in settings
    'react',
  ],
};

function hasPermission(userRole, permission) {
  return PERMISSIONS[userRole]?.includes(permission) || false;
}
```

3. **Socket Permission Checks**
   - Add permission check before executing sensitive actions
   - Return error if user lacks permission

4. **Example Integration**

```javascript
// In rooms.socket.js
socket.on('kickUser', async ({ roomId, targetUserId }) => {
  const room = await Room.findOne({ roomId });
  const userRole = room.members.find((m) => m.userId === socket.userId)?.role;

  if (!hasPermission(userRole, 'kick_user')) {
    return socket.emit('error', { message: 'Permission denied' });
  }

  // Proceed with kick logic...
});
```

5. **Client-Side Permission Checks**
   - File: `src/hooks/usePermissions.ts`
   - Provide hook to check if current user can perform action
   - Hide/disable UI elements based on permissions

### Acceptance Criteria

- [ ] Only host can kick users
- [ ] Only host can change room settings
- [ ] Guests have limited permissions
- [ ] Permission errors are clear and user-friendly
- [ ] UI reflects user's permission level

---

## TASK 4: Session Tracking

**Status**: ✅ COMPLETE

### Implementation

1. **Create Session Model**
   - File: `server/src/models/Session.js`

```javascript
{
  sessionId: String (unique),
  roomId: String (indexed),
  startedAt: Date,
  endedAt: Date,

  participants: [{
    userId: String,
    joinedAt: Date,
    leftAt: Date,
    duration: Number (minutes)
  }],

  // Computed on session end
  totalDuration: Number (minutes),
  peakParticipants: Number,

  // Links to generated content
  summaryId: String (ref: MeetingSummary),
  transcriptIds: [String] (refs: Transcript),

  // Metadata
  purpose: String (from room),
  quality: {
    avgLatency: Number,
    avgPacketLoss: Number,
    disconnections: Number
  }
}
```

2. **Session Lifecycle**
   - Start session when first user joins empty room
   - Track all joins/leaves
   - End session when last user leaves OR host clicks "End Meeting"
   - Compute statistics on session end

3. **Update Room on Session End**
   - Increment `totalSessions`
   - Add to `totalDuration`
   - Update `totalParticipants` (unique count)

### Acceptance Criteria

- [ ] Each room visit creates a session
- [ ] Sessions track all participants accurately
- [ ] Session statistics are computed correctly
- [ ] Room metadata is updated after each session

---

## TASK 5: Testing & Validation

**Status**: ❌ NOT STARTED

### Test Cases

1. **Room Persistence**
   - Create room → all users leave → rejoin → room state intact
   - Room settings persist across sessions
   - Host remains host across sessions

2. **Event Logging**
   - Perform 10 different actions → verify all logged
   - Query events by room → get correct results
   - Query events by time range → get correct results

3. **Permissions**
   - Guest tries to kick user → denied
   - Member tries to change settings → denied
   - Host performs all actions → allowed

4. **Session Tracking**
   - Start session → 3 users join → 2 leave → 1 leaves → session ends
   - Verify participant durations are accurate
   - Verify room stats updated correctly

### Manual Testing Checklist

- [ ] Create room as user A
- [ ] Join room as user B (should be member)
- [ ] User A kicks user C (should work)
- [ ] User B tries to kick user C (should fail)
- [ ] All users leave
- [ ] User A rejoins (should still be host)
- [ ] Check MongoDB: Room exists, events logged, session created

---

## DELIVERABLES

### Code Files

- [ ] `server/src/models/Room.js`
- [ ] `server/src/models/Session.js`
- [ ] `server/src/models/RoomEvent.js` (updated)
- [ ] `server/src/middleware/permissions.js`
- [ ] `server/src/sockets/rooms.socket.js` (updated)
- [ ] `src/hooks/usePermissions.ts`

### API Endpoints

- [ ] `GET /api/rooms/:roomId`
- [ ] `GET /api/rooms/user/:userId`
- [ ] `PATCH /api/rooms/:roomId`
- [ ] `DELETE /api/rooms/:roomId`

### Socket Events (Updated)

- [ ] `createRoom` - Creates persistent room
- [ ] `joinRoom` - Adds user to members
- [ ] `leaveRoom` - Updates lastSeenAt
- [ ] All events log to RoomEvent

### Tests

- [ ] Room persistence tests
- [ ] Permission system tests
- [ ] Event logging tests
- [ ] Session tracking tests

---

## SUCCESS CRITERIA

Phase 0 is complete when:

1. ✅ Rooms persist after all users leave
2. ✅ Every user action is logged with metadata
3. ✅ Permission system prevents unauthorized actions
4. ✅ Sessions track all participant activity
5. ✅ All tests pass
6. ✅ No regressions in existing functionality

**DO NOT PROCEED TO PHASE 1 UNTIL ALL CRITERIA ARE MET.**

---

## NEXT STEPS

After Phase 0 completion:

1. Review metrics: Are rooms being created? Are users returning?
2. Validate data quality: Check MongoDB for completeness
3. Proceed to Phase 1: Outcome Engine
