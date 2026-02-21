# Cospira System Debug & Fix Plan

**Priority Sequence (Do in this order):**

## PHASE 1: Foundation Fixes (Critical)

### 1. ✅ Responsive Screen Adaptation Loop
**File:** `src/hooks/useDeviceType.ts` (CREATE NEW)
**Issue:** Screen switching infinite loop between mobile ↔ desktop
**Root Cause:** No stable device detection, re-renders trigger resize events
**Fix:**
- Create device detection hook with localStorage persistence
- Use ResizeObserver instead of media queries for container-based detection
- Add debouncing to prevent infinite loops
- Use refs to track previous state

```typescript
// src/hooks/useDeviceType.ts
export const useDeviceType = () => {
  const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>(() => {
    return localStorage.getItem('preferredDeviceView') || detectDevice();
  });
  // ... implementation
}
```

### 2. ✅ Layout Consistency (SPA Navigation)
**Files:** All page components
**Issue:** Full page reloads instead of SPA navigation
**Fix:** Replace `window.location` with React Router `useNavigate()`
**Impact:** Fixes issues #11, #12, #13

---

## PHASE 2: Real-Time Sync Fixes

### 3. File Sharing Visibility
**File:** `server/src/sockets/room.socket.js`
**Issue:** Files visible only to uploader
**Root Cause:** Server not broadcasting file events to all participants
**Fix:**
```javascript
socket.on('upload-file', (data, callback) => {
  // Save file metadata
  // Broadcast to ALL room participants (not just uploader)
  io.to(data.roomId).emit('file-uploaded', {
    id: data.file.id,
    name: data.file.name,
    userId: data.file.userId,
    url: generateDownloadUrl(data.file.id),
    timestamp: Date.now()
  });
});
```

### 4. Screen Sharing State Sync
**File:** `src/contexts/WebSocket/useMediaStream.ts`
**Issue:** Screen streams not cleaning up, blank screen rendering
**Root Cause:** No cleanup on stopScreenShare, state not syncing
**Fix:**
- Add proper track cleanup
- Emit screen-stop event to all participants
- Clear remoteScreenStreams on stop

### 5. Game State Synchronization
**File:** `src/domains/games/` (CREATE/UPDATE)
**Issue:** Game state not syncing across clients
**Root Cause:** Using local state, no WebSocket sync
**Fix:**
- Create game sync service
- Emit game-state-update on every move
- Use server as source-of-truth for game state
- Implement deterministic updates

---

## PHASE 3: Feature Completeness

### 6. Public Matchmaking System
**Files:** `src/services/MatchmakingService.ts`, server socket handlers
**Missing:**
- Auto-room creation on match
- Opponent pairing logic
- Replay invite flow
**Implementation:**
```
1. On match found → emit 'match-found'
2. Server creates room automatically
3. Emit 'room-ready' with roomId
4. Both clients join room
5. On game end → show 'Play Again?' modal
6. If accept → auto-rematch, if decline → new opponent search
```

### 7. Intelligence/Analytics Metrics
**Files:** `src/pages/Intelligence.tsx`, backend tracking
**Issue:** All metrics show "0"
**Root Cause:** No tracking implementation
**Fix:**
- Create analytics event logger
- Track events: room-joined, message-sent, file-shared, game-played
- Aggregate in backend
- Real-time updates via WebSocket

---

## PHASE 4: UI/UX Fixes

### 8. Page Layout Consistency
**Files:** All pages needing layout wrapper
**Missing:** Navbar + Sidebar on:
- `/ai-insights`
- `/upcoming`
- `/settings`
**Fix:** Create `PageLayout` wrapper component

### 9. Profile & Recent Rooms
**File:** `src/pages/Profile.tsx`
**Issue:** Recent rooms not showing
**Fix:**
- Query recent rooms from backend
- Display last 5 joined rooms
- Add room click handler to redirect

---

## Implementation Checklist

- [ ] Create device type detection hook
- [ ] Add responsive breakpoint manager
- [ ] Fix file broadcast on server
- [ ] Implement screen share cleanup
- [ ] Create game sync service
- [ ] Implement matchmaking auto-room creation
- [ ] Add activity tracking
- [ ] Fix all page layouts with consistent wrappers
- [ ] Replace all window.location with useNavigate()
- [ ] Test cross-device compatibility
- [ ] Verify WebRTC stability
- [ ] Load test matchmaking system

---

## Quick Fixes (30 min each)

1. **SPA Navigation:** Search and replace all `window.location.href = '/path'` with `navigate('/path')`
2. **Settings Routing:** Link Settings page to Profile edit
3. **Missing Navbars:** Add `<Navbar />` and `<Sidebar />` to pages
4. **Profile Edit Button:** Add button that opens modal/slides to edit form

---

## Architecture Improvements Needed

1. **State Management:** Centralize game state in WebSocketContext
2. **Real-time Sync:** Ensure all room events broadcast to all participants
3. **Error Handling:** Add retry logic for failed uploads/events
4. **Performance:** Add caching for file metadata, user lists
5. **Testing:** Add e2e tests for matchmaking, game sync, file sharing

