# COSPIRA TESTING GUIDE

**Version**: Phases 0-2
**Last Updated**: 2026-01-10

---

## 🧪 TESTING CHECKLIST

### Phase 0: Hard Foundations

#### Room Management

- [ ] Create a room via REST API
- [ ] Create a room via socket
- [ ] Join a room
- [ ] Leave a room
- [ ] Room persists after all users leave
- [ ] Room can be rejoined
- [ ] Get room details via API
- [ ] Update room settings (host only)
- [ ] Archive room (host only)
- [ ] Non-host cannot update/archive room

#### Session Tracking

- [ ] Session starts when first user joins
- [ ] Session tracks all participants
- [ ] Session tracks join/leave times
- [ ] Session calculates durations correctly
- [ ] Session ends when last user leaves
- [ ] Session data persists in MongoDB

#### Event Logging

- [ ] Join event logged
- [ ] Leave event logged
- [ ] Chat event logged
- [ ] Mute/unmute events logged
- [ ] Screen share events logged
- [ ] Events queryable by room
- [ ] Events queryable by type
- [ ] Events queryable by time range

#### Permissions

- [ ] Host can kick users
- [ ] Member cannot kick users
- [ ] Guest has limited permissions
- [ ] Permission checks work in socket handlers
- [ ] Room settings affect permissions

---

### Phase 1: Outcome Engine

#### Summary Generation

- [ ] Generate summary for completed session
- [ ] Summary includes bullets (max 5)
- [ ] Summary includes action items
- [ ] Summary includes decisions
- [ ] Summary auto-generates on session end (>2 min)
- [ ] Summary not generated for short sessions (<2 min)
- [ ] Summary stored in MongoDB
- [ ] Summary linked to session

#### Quick Summary (Late Join)

- [ ] Generate quick summary for last 10 minutes
- [ ] Quick summary returns bullets
- [ ] Quick summary works with no transcripts
- [ ] Quick summary handles empty room

#### Action Items

- [ ] Create action item manually
- [ ] Action item assigned to owner
- [ ] Update action status to "in_progress"
- [ ] Update action status to "completed"
- [ ] Get pending actions for user
- [ ] Get pending actions for room
- [ ] Action status broadcast to room

#### Decisions

- [ ] AI extracts decisions from conversation
- [ ] Vote on decision (yes/no/abstain)
- [ ] Vote updates replace previous vote
- [ ] Get decision results
- [ ] Decision status updates
- [ ] Vote broadcast to room

---

### Phase 2: Room Memory

#### Timeline

- [ ] Get room timeline
- [ ] Timeline shows all sessions
- [ ] Timeline includes summaries
- [ ] Timeline sorted by date (newest first)
- [ ] Timeline limited to requested count

#### Last Session Summary

- [ ] Get last session summary
- [ ] Returns null if no previous session
- [ ] Includes bullets, actions, decisions
- [ ] Shows session metadata (date, duration)

#### Pending Items

- [ ] Get pending actions for room
- [ ] Get pending actions for specific user
- [ ] Get pending decisions for room
- [ ] Get user's pending items (actions + unvoted decisions)
- [ ] Pending items sorted by priority/date

#### Room Statistics

- [ ] Total sessions calculated correctly
- [ ] Total duration calculated correctly
- [ ] Action completion rate calculated
- [ ] Decision acceptance rate calculated
- [ ] Average session duration calculated
- [ ] Average participants calculated

#### Auto-Send on Join

- [ ] Last session summary sent on room join
- [ ] Pending actions reminder sent on join
- [ ] Events only sent if data exists
- [ ] Events not sent for first-time rooms

---

## 🔬 MANUAL TESTING SCENARIOS

### Scenario 1: Complete Meeting Flow

**Steps**:

1. User A creates room "Team Standup"
2. User A joins room
3. User B joins room
4. Users chat for 5 minutes
5. User A creates action: "Review PR #123" (owner: User B)
6. User A generates summary
7. Both users leave room
8. Verify session ended
9. Verify summary auto-generated
10. User B rejoins room
11. Verify last session summary sent
12. Verify pending action reminder sent

**Expected Results**:

- ✅ Session tracked with 2 participants
- ✅ Summary contains chat highlights
- ✅ Action item created and assigned
- ✅ Auto-summary generated on session end
- ✅ User B sees last session on rejoin
- ✅ User B reminded of pending action

---

### Scenario 2: Late Joiner Catch-Up

**Steps**:

1. User A creates room and starts meeting
2. Users A, B, C chat for 15 minutes
3. User D joins room (late)
4. User D requests quick summary
5. User D sees last 10 minutes summary

**Expected Results**:

- ✅ Quick summary generated
- ✅ Summary covers last 10 minutes only
- ✅ User D can catch up quickly

---

### Scenario 3: Action Item Lifecycle

**Steps**:

1. Create room and session
2. Generate summary with action items
3. User marks action as "in_progress"
4. User marks action as "completed"
5. Check completion rate in stats

**Expected Results**:

- ✅ Action status updates
- ✅ Status changes broadcast to room
- ✅ Completion rate reflects changes
- ✅ Completed actions tracked

---

### Scenario 4: Decision Voting

**Steps**:

1. Create room with 3 users
2. Generate summary with decision
3. User A votes "yes"
4. User B votes "no"
5. User C votes "yes"
6. User A changes vote to "abstain"
7. Check vote results

**Expected Results**:

- ✅ Votes recorded correctly
- ✅ Vote changes replace previous vote
- ✅ Results: yes=1, no=1, abstain=1
- ✅ Vote updates broadcast

---

### Scenario 5: Room Timeline

**Steps**:

1. Create room
2. Hold 3 separate sessions over time
3. Generate summaries for each
4. Request room timeline
5. Check statistics

**Expected Results**:

- ✅ Timeline shows all 3 sessions
- ✅ Each session has summary
- ✅ Stats show total sessions = 3
- ✅ Total duration = sum of all sessions
- ✅ Timeline sorted newest first

---

## 🔧 API TESTING

### Using cURL

```bash
# Create room
curl -X POST https://localhost:3001/api/create-room \
  -H "Content-Type: application/json" \
  -d '{
    "roomId": "test-room",
    "roomName": "Test Room",
    "userId": "user-123"
  }'

# Get room details
curl https://localhost:3001/api/rooms/test-room

# Get room events
curl https://localhost:3001/api/rooms/test-room/events?limit=50

# Get room sessions
curl https://localhost:3001/api/rooms/test-room/sessions

# Update room settings
curl -X PATCH https://localhost:3001/api/rooms/test-room \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Room Name",
    "settings": {
      "maxParticipants": 30
    }
  }'
```

### Using Postman/Insomnia

**Collection**: Import these requests

```json
{
  "name": "Cospira API Tests",
  "requests": [
    {
      "name": "Create Room",
      "method": "POST",
      "url": "https://localhost:3001/api/create-room",
      "body": {
        "roomId": "{{roomId}}",
        "roomName": "Test Room",
        "userId": "{{userId}}"
      }
    },
    {
      "name": "Get Room",
      "method": "GET",
      "url": "https://localhost:3001/api/rooms/{{roomId}}"
    },
    {
      "name": "Get Room Events",
      "method": "GET",
      "url": "https://localhost:3001/api/rooms/{{roomId}}/events"
    },
    {
      "name": "Get Room Sessions",
      "method": "GET",
      "url": "https://localhost:3001/api/rooms/{{roomId}}/sessions"
    }
  ]
}
```

---

## 🧪 SOCKET TESTING

### Using Socket.IO Client

```javascript
import io from 'socket.io-client';

const socket = io('https://localhost:3001', {
  transports: ['websocket'],
  auth: {
    token: 'your-jwt-token', // Optional
  },
});

// Test summary generation
socket.emit('summary:generate', { roomId: 'test-room' }, (response) => {
  console.log('Summary:', response);
  assert(response.success === true);
  assert(response.summary.bullets.length > 0);
});

// Test action creation
socket.emit(
  'action:create',
  {
    roomId: 'test-room',
    text: 'Test action',
    owner: 'user-123',
    priority: 'high',
  },
  (response) => {
    console.log('Action created:', response);
    assert(response.success === true);
    assert(response.action.text === 'Test action');
  }
);

// Test timeline
socket.emit('timeline:get', { roomId: 'test-room' }, (response) => {
  console.log('Timeline:', response);
  assert(response.success === true);
  assert(response.timeline.roomId === 'test-room');
});
```

---

## 📊 DATABASE VERIFICATION

### MongoDB Queries

```javascript
// Connect to MongoDB
mongosh "mongodb://localhost:27017/cospira"

// Check rooms
db.rooms.find({ roomId: 'test-room' }).pretty()

// Check sessions
db.sessions.find({ roomId: 'test-room' }).pretty()

// Check summaries
db.meetingsummaries.find({ roomId: 'test-room' }).pretty()

// Check events
db.roomevents.find({ roomId: 'test-room' }).limit(10).sort({ timestamp: -1 })

// Check action completion rate
db.meetingsummaries.aggregate([
  { $match: { roomId: 'test-room' } },
  { $unwind: '$actionItems' },
  { $group: {
    _id: '$actionItems.status',
    count: { $sum: 1 }
  }}
])
```

---

## 🐛 DEBUGGING TIPS

### Enable Debug Logging

```javascript
// In server/src/logger.js
const logger = winston.createLogger({
  level: 'debug', // Change from 'info' to 'debug'
  // ...
});
```

### Check Server Logs

```bash
# Watch server logs
tail -f server.log

# Filter for specific service
grep "RoomService" server.log
grep "MeetingSummarizer" server.log
grep "RoomTimeline" server.log
```

### Common Issues

**Issue**: Summary not generating

```javascript
// Check:
1. Session duration > 2 minutes?
2. Transcripts exist in database?
3. LLMService initialized with API key?
4. Check server logs for errors
```

**Issue**: Permission denied

```javascript
// Check:
1. User is member of room?
2. User has correct role?
3. Room settings allow action?
```

**Issue**: Events not broadcasting

```javascript
// Check:
1. Socket connected to room?
2. Room ID correct?
3. Socket.IO connection stable?
```

---

## ✅ ACCEPTANCE CRITERIA

### Phase 0

- [ ] All rooms persist in MongoDB
- [ ] All sessions tracked with participants
- [ ] All events logged and queryable
- [ ] Permission system enforces access control
- [ ] REST API returns correct data

### Phase 1

- [ ] Summaries auto-generate on session end
- [ ] Action items can be created and updated
- [ ] Decisions can be voted on
- [ ] Quick summaries work for late joiners
- [ ] All socket events broadcast correctly

### Phase 2

- [ ] Timeline shows complete room history
- [ ] Last session summary sent on join
- [ ] Pending actions reminder sent on join
- [ ] Room statistics calculated correctly
- [ ] User's pending items queryable

---

## 🚀 PERFORMANCE TESTING

### Load Testing

```javascript
// Test concurrent users
const users = 50;
const sockets = [];

for (let i = 0; i < users; i++) {
  const socket = io('https://localhost:3001');
  socket.emit('join-room', { roomId: 'test-room', user: { id: `user-${i}` } });
  sockets.push(socket);
}

// Measure response times
// Check server CPU/memory usage
// Verify all events broadcast correctly
```

### Database Performance

```javascript
// Check query performance
db.sessions.find({ roomId: 'test-room' }).explain('executionStats');

// Verify indexes are used
db.rooms.getIndexes();
db.sessions.getIndexes();
db.meetingsummaries.getIndexes();
```

---

## 📝 TEST RESULTS TEMPLATE

```markdown
# Test Results - [Date]

## Phase 0: Hard Foundations

- Room Management: ✅ PASS
- Session Tracking: ✅ PASS
- Event Logging: ✅ PASS
- Permissions: ✅ PASS

## Phase 1: Outcome Engine

- Summary Generation: ✅ PASS
- Action Items: ✅ PASS
- Decisions: ✅ PASS
- Quick Summary: ✅ PASS

## Phase 2: Room Memory

- Timeline: ✅ PASS
- Last Session: ✅ PASS
- Pending Items: ✅ PASS
- Statistics: ✅ PASS

## Issues Found

- None

## Performance

- Response Time: < 100ms
- Concurrent Users: 50+
- Database Queries: Optimized

## Conclusion

All tests passed. Ready for production.
```

---

**Happy Testing!** 🧪

For questions or issues, check the server logs and MongoDB data first.
