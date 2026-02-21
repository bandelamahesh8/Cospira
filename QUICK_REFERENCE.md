# COSPIRA FIX - QUICK REFERENCE & CHECKLIST

## 🎯 13 Issues → 6 Services Created ✅

### Issue ↔ Service Mapping

| Issue # | Issue | Service | File | Status |
|---------|-------|---------|------|--------|
| 1 | Responsive Layout Loop | useDeviceType Hook | `src/hooks/useDeviceType.ts` | ✅ DONE |
| 2 | File Sharing Invisible | Already Working* | Server broadcasts with `io.to(roomId).emit('new-file')` | ✅ VERIFY |
| 3 | Screen Share Blank | useScreenShare Hook | `src/contexts/WebSocket/useScreenShare.ts` | ✅ DONE |
| 4 | Game Sync Failure | GameSyncService | `src/services/GameSyncService.ts` | ✅ DONE |
| 5 | Video Flickering | Needs Server Config | TURN/STUN settings | 🔄 TODO |
| 6 | Sidebar Missing Mobile | PageLayout Wrapper | `src/components/layout/PageLayout.tsx` | ✅ DONE |
| 7 | Matchmaking Failure | PublicMatchmakingService | `src/services/MatchmakingService.ts` (extended) | ✅ DONE |
| 8 | Intelligence "0" Metrics | ActivityTracker | `src/services/ActivityTracker.ts` | ✅ DONE |
| 9 | AI Insights Missing | ActivityTracker + PageLayout | Integrate into pages | 🔄 TODO |
| 10 | Profile Page Empty | Backend API + PageLayout | Fetch recent rooms API | 🔄 TODO |
| 11 | SPA Navigation Broken | Replace window.location | Use useNavigate | 🔄 TODO |
| 12 | Upcoming Page Layout | PageLayout Wrapper | Wrap page | 🔄 TODO |
| 13 | Settings Route | Link to Profile | Update routing | 🔄 TODO |

---

## 📦 Created Services - Copy/Paste Usage

### 1️⃣ useDeviceType Hook
```typescript
import { useDeviceType, useIsMobileDevice } from '@/hooks/useDeviceType';

const { type, width, height, orientation, isTouchDevice } = useDeviceType();
const isMobile = useIsMobileDevice();
```

### 2️⃣ useScreenShare Hook
```typescript
import { useScreenShare } from '@/contexts/WebSocket/useScreenShare';

const { startScreenShare, stopScreenShare, toggleScreenShare, isSharing } = useScreenShare(
  (stream) => setState(prev => ({ ...prev, localScreenStream: stream })),
  signalingRef,
  roomId
);
```

### 3️⃣ GameSyncService
```typescript
import { GameSyncService } from '@/services/GameSyncService';

const gameSyncService = new GameSyncService(socket);
gameSyncService.initializeForRoom(roomId);
gameSyncService.startGame('chess', players);
gameSyncService.makeMove(playerId, action);
gameSyncService.on('game-ended', (state) => {});
```

### 4️⃣ PublicMatchmakingService
```typescript
import { PublicMatchmakingService } from '@/services/MatchmakingService';

const matchmaking = new PublicMatchmakingService(socket);
await matchmaking.joinQueue(userId, userName, 'chess');
matchmaking.on('match-found', (match) => {});
matchmaking.requestRematch();
matchmaking.acceptRematch();
matchmaking.declineRematch(userId, userName, gameType);
```

### 5️⃣ ActivityTracker
```typescript
import { getActivityTracker } from '@/services/ActivityTracker';

const tracker = getActivityTracker(socket);
tracker.initialize(userId);
tracker.trackRoomJoined(roomId);
tracker.trackMessageSent(roomId);
tracker.trackFileShared(roomId, fileName);
tracker.trackGamePlayed(roomId, gameType, duration);
tracker.trackScreenShared(roomId, duration);
tracker.trackVideoCall(roomId, duration);
const metrics = await tracker.fetchMetrics();
```

### 6️⃣ PageLayout Wrapper
```typescript
import { PageLayout } from '@/components/layout/PageLayout';

export const MyPage = () => (
  <PageLayout showNavbar showSidebar>
    <div>Your content here</div>
  </PageLayout>
);
```

---

## 🔧 INTEGRATION TASKS (Ready to Start)

### Task 1: Wrap All Pages (15 min)
**Files to update:**
- [ ] `src/pages/AIInsightsPage.tsx` - Wrap with `<PageLayout>`
- [ ] `src/pages/UpcomingFeatures.tsx` - Wrap with `<PageLayout>`
- [ ] `src/pages/Settings.tsx` - Wrap with `<PageLayout>`
- [ ] `src/pages/Profile.tsx` - Wrap with `<PageLayout>`

**Code:**
```typescript
import { PageLayout } from '@/components/layout/PageLayout';

export const MyPage = () => (
  <PageLayout>
    {/* existing content */}
  </PageLayout>
);
```

---

### Task 2: Replace window.location (30 min)
**Search pattern:** `window.location|location\.href`

**Files likely affected:**
- [ ] All button onClick handlers
- [ ] All link handlers
- [ ] All redirect logic

**Replace:**
```typescript
// BEFORE
onClick={() => window.location.href = '/dashboard'}

// AFTER  
import { useNavigate } from 'react-router-dom';
const navigate = useNavigate();
onClick={() => navigate('/dashboard')}
```

---

### Task 3: Integrate ActivityTracker (20 min)
**File:** `src/contexts/WebSocketContext.tsx`

**Add imports:**
```typescript
import { ActivityTracker, getActivityTracker } from '@/services/ActivityTracker';
```

**Add to WebSocketProvider:**
```typescript
const trackerRef = useRef<ActivityTracker | null>(null);

useEffect(() => {
  if (user?.id && signalingRef.current) {
    trackerRef.current = getActivityTracker(signalingRef.current);
    trackerRef.current.initialize(user.id);
  }
  return () => trackerRef.current?.destroy();
}, [user?.id, signalingRef]);
```

**Track events (add to existing handlers):**
```typescript
// In onRoomJoined
trackerRef.current?.trackRoomJoined(roomId);

// In sendMessage
trackerRef.current?.trackMessageSent(roomId);

// In uploadFile
trackerRef.current?.trackFileShared(roomId, file.name);

// In startGame
trackerRef.current?.trackGamePlayed(roomId, gameType, duration);

// In startScreenShare
trackerRef.current?.trackScreenShared(roomId, duration);
```

---

### Task 4: Update Server Sockets (45 min)

**File:** `server/src/sockets/game.socket.js`
```javascript
socket.on('game-move', ({ roomId, move, gameState }) => {
  io.to(roomId).emit('game-move-received', { move, gameState });
});

socket.on('game-ended', ({ roomId, winner, finalState }) => {
  io.to(roomId).emit('game-ended-all', { winner, finalState });
});
```

**File:** `server/src/sockets/matchmaking.socket.js` (CREATE NEW)
```javascript
export default function registerMatchmakingHandlers(io, socket) {
  const matchingQueue = [];
  
  socket.on('matchmaking-join-public', ({ userId, userName, gameType }, callback) => {
    matchingQueue.push({ userId, userName, gameType, socketId: socket.id });
    
    // Try to find opponent
    const opponent = matchingQueue.find(q => 
      q.userId !== userId && q.gameType === gameType
    );
    
    if (opponent) {
      const roomId = generateRoomId();
      
      io.to(socket.id).emit('public-match-found', {
        roomId,
        opponent: { id: opponent.userId, name: opponent.userName }
      });
      
      io.to(opponent.socketId).emit('public-match-found', {
        roomId,
        opponent: { id: userId, name: userName }
      });
      
      // Remove from queue
      matchingQueue.splice(matchingQueue.indexOf(opponent), 1);
    }
    
    callback?.({ success: true });
  });
}
```

---

### Task 5: Add Activity Logging Model

**File:** `server/src/models/ActivityLog.js` (CREATE NEW)
```javascript
import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  type: { 
    type: String, 
    enum: ['room-joined', 'message-sent', 'file-shared', 'game-played', 'video-call', 'screen-shared'],
    required: true 
  },
  roomId: String,
  duration: Number,
  metadata: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now, index: true }
}, { collection: 'activity_logs' });

// TTL index - keep for 90 days
activityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

export default mongoose.model('ActivityLog', activityLogSchema);
```

---

### Task 6: Test All Fixes

**Test Device Detection:**
- [ ] Open on desktop → sidebar visible
- [ ] Open on mobile → sidebar hidden
- [ ] Resize window → no infinite flipping
- [ ] Rotate mobile → updates orientation

**Test File Sharing:**
- [ ] Host uploads file
- [ ] Participant joins/reloads → file visible
- [ ] Download link works

**Test Screen Sharing:**
- [ ] Start screen share
- [ ] All see stream
- [ ] Stop share → clean up
- [ ] No blank screens

**Test Game Sync:**
- [ ] 2 players, 1 game
- [ ] Moves sync < 200ms
- [ ] Board state matches
- [ ] Winner detected

**Test Matchmaking:**
- [ ] 2 players search
- [ ] Auto-match in < 5s
- [ ] Room created
- [ ] Both joined
- [ ] Rematch flow works

**Test Activity:**
- [ ] Perform various activities
- [ ] Check Intelligence page
- [ ] Metrics increase
- [ ] Activity log shows events

---

## 📋 FILES CREATED (Ready to Use)

```
✅ src/hooks/useDeviceType.ts
✅ src/contexts/WebSocket/useScreenShare.ts
✅ src/services/GameSyncService.ts
✅ src/services/MatchmakingService.ts (extended)
✅ src/services/ActivityTracker.ts
✅ src/components/layout/PageLayout.tsx

📄 IMPLEMENTATION_GUIDE.md (you're reading it!)
📄 DEBUG_FIX_PLAN.md
```

---

## 🚀 NEXT IMMEDIATE ACTIONS

1. **TODAY (Right Now):**
   - [ ] Read IMPLEMENTATION_GUIDE.md (you did ✅)
   - [ ] Verify file broadcast works: check console when uploading file
   - [ ] Check if window.location is used (search codebase)

2. **NEXT 1 HOUR:**
   - [ ] Wrap pages with PageLayout (15 min tasks)
   - [ ] Replace window.location calls (30 min tasks)
   - [ ] Integrate ActivityTracker (20 min task)

3. **NEXT 2-3 HOURS:**
   - [ ] Update server sockets
   - [ ] Add ActivityLog model
   - [ ] Test all 6 scenarios

4. **VERIFICATION:**
   - [ ] All 13 issues resolved
   - [ ] Cross-device testing passed
   - [ ] No console errors
   - [ ] Metrics showing real data

---

## 💡 TROUBLESHOOTING

| Problem | Solution |
|---------|----------|
| Files still not visible | Check server `io.to(roomId).emit('new-file', file)` |
| Responsive still flipping | Ensure using useDeviceType, not media queries |
| Game not syncing | Verify socket handlers emit to ALL participants |
| Metrics still 0 | Check ActivityTracker initialized in WebSocketProvider |
| Sidebar not showing | Verify PageLayout wrapper applied to page |
| Navigation has full reload | Replace all `window.location.href` with `navigate()` |

---

## 📞 SUPPORT

**Need help?** Check:
1. IMPLEMENTATION_GUIDE.md - Detailed instructions
2. Each service file - Has JSDoc comments
3. Console errors - Check network & socket connections
4. Server logs - Check activity batch requests coming in

---

**Status:** All 6 core services created ✅  
**Next:** Integration phase (4-6 hours total)  
**End Result:** All 13 issues resolved 🎉

