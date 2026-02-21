# Phase 5 Execution Guide - How to Run Tests

**Date:** January 27, 2026
**Status:** Ready for Testing
**Build:** ✅ PASSED

---

## Quick Start - 5 Minutes

### Step 1: Verify Build Success
```powershell
cd "c:\Users\mahes\Downloads\PROJECTS\COSPIRA_PROJECT\COSPIRA_MAIN"
npm run build
# Should complete with "built in X.XXs" message
```

**Expected:** ✅ Build succeeds with 0 errors

### Step 2: Start Dev Server
```powershell
npm run dev
# Should start both client (port 5173) and server
```

**Expected:** ✅ Server running on http://localhost:5173

### Step 3: Open in Browser
```
Navigate to: http://localhost:5173
```

**Expected:** ✅ Application loads, no console errors

### Step 4: Run Quick Tests
1. Navigate to different pages (check navbar/sidebar)
2. Send a message in a room (check Activity Tracker in console)
3. Resize browser (check responsive layout)
4. Check DevTools Network tab for activity-batch events

**Expected:** ✅ All working as designed

---

## Detailed Testing Guide

### Environment Setup

#### Prerequisites
- Node.js installed
- npm available
- Browser (Chrome, Firefox, Safari, or Edge)
- DevTools available in browser

#### Verify Setup
```powershell
node --version    # Should be v18+
npm --version     # Should be v8+
```

### Build Verification

#### Full Build Test
```powershell
npm run build
```

**What to check:**
- ✅ No "ERROR" messages in output
- ✅ No TypeScript errors
- ✅ Final message: "built in X.XXs"
- ✅ dist/ folder contains assets

#### Build Output Analysis
```powershell
# Count generated files
Get-ChildItem dist/assets | Measure-Object
# Should be 24+ asset files
```

### Development Server Testing

#### Start Dev Server
```powershell
npm run dev
```

**What to look for:**
```
[client] VITE v7.x.x ready in X ms
[client] ➜ Local: http://localhost:5173/
[server] Server running on port XXXX
```

#### Verify Both Processes
- Look for both `[client]` and `[server]` prefixes
- No error messages in either process
- Both should be ready within 10 seconds

### Browser Testing

#### Test 1: Page Navigation (2 minutes)

**Open DevTools Console (F12)**

```javascript
// You should see no errors
// Look for successful connection messages
```

**Navigate to Pages:**
1. Click Dashboard → Check navbar/sidebar
2. Click Settings → Check layout consistency
3. Click Profile → Check layout consistency
4. Click Intelligence → Check layout consistency

**Expected in Console:**
```
[WebSocketContext] Initialized for user: ...
[Socket.IO] Connected to server
No errors or warnings
```

**Visual Check:**
- ✅ Navbar visible on all pages
- ✅ Sidebar visible on desktop
- ✅ Content properly padded
- ✅ No overlapping elements

#### Test 2: SPA Navigation (2 minutes)

**Open DevTools Network Tab**

**Test Navigation Behavior:**
1. Navigate using sidebar/navbar links
2. Watch Network tab for "document" requests
3. Navigate at least 5 times

**Expected:**
- ✅ No "document" type requests (full page reloads)
- ✅ Only XHR and WS (WebSocket) requests
- ✅ URL updates in address bar
- ✅ Page transitions are smooth

**If you see "document" request:**
- ❌ There's a full page reload happening
- This indicates SPA navigation not working
- Note which page/action caused it

#### Test 3: Activity Tracking (3 minutes)

**Open DevTools Console**

**Step 1: Join a Room**
```
Navigate to a public room or create one
Expected console message:
[ActivityTracker] Initialized for user: xxx
```

**Step 2: Send a Message**
```
Type message in chat and send
Expected console message:
[ActivityTracker] Message sent tracked
```

**Check Network Tab:**
- Look for activity-batch event emission
- Should see Socket.IO emit activity-batch
- Payload should contain message event

**Step 3: Upload a File**
```
Click file upload button
Select a file
Expected console message:
[ActivityTracker] File shared tracked: filename.ext
```

**Check Network:**
- activity-batch event should be sent
- Verify file is visible to other users

**Step 4: Verify Server Received Events**

**Check Server Console:**
```
[Analytics] Received X activity events from user xxx
```

If you don't see this:
- Check server is running (should see both [client] and [server])
- Check server logs for errors

#### Test 4: Responsive Design (3 minutes)

**Method 1: Browser DevTools**
1. Open DevTools (F12)
2. Click device toggle (top left)
3. Select different device presets

**Test Devices:**
- iPhone SE (375px) - Mobile
- iPad (768px) - Tablet
- Desktop (1920px) - Desktop

**For Each Device:**
- [ ] Navbar visible and responsive
- [ ] Sidebar hidden on mobile, visible on desktop
- [ ] Content readable and properly spaced
- [ ] No horizontal scrolling
- [ ] Buttons touch-friendly (on mobile)

**Method 2: Manual Resizing**
1. Drag browser window edge
2. Resize from 375px to 1920px
3. Watch layout adapt

**Expected:**
- ✅ Layout smoothly adapts
- ✅ No jumping or flashing
- ✅ Sidebar toggles appropriately
- ✅ Content remains readable

#### Test 5: Full End-to-End (5 minutes)

**Complete User Workflow:**

1. **Login** (if not already logged in)
   - Go to Auth page
   - Login with test credentials

2. **Join Room**
   - Click "Join Public Room" or create new
   - Expected: Activity tracked
   - Check console: `[ActivityTracker] Room joined tracked`

3. **Send Messages** (3 times)
   - Type and send 3 messages
   - Expected: Each tracked
   - Check console: 3x `[ActivityTracker] Message sent tracked`

4. **Upload File**
   - Click file upload button
   - Select any file
   - Expected: File appears and is tracked
   - Check console: `[ActivityTracker] File shared tracked`

5. **Navigate Without Reload**
   - Click on other page in sidebar
   - Check Network tab: No "document" request
   - Expected: SPA navigation works

6. **Check Intelligence Page**
   - Go to Intelligence/AIInsights page
   - Expected: Metrics show activities
   - Should display: 1 room, 3 messages, 1 file

7. **Check Layout on Mobile**
   - Resize to 375px width
   - Verify all elements still visible
   - Check sidebar hidden but accessible

**Success Criteria:**
- ✅ All activities logged in console
- ✅ No full page reloads
- ✅ Intelligence page shows correct metrics
- ✅ Mobile layout responsive

---

## Console Logging Reference

### What to Look For in DevTools Console

#### Good Signs (Successful Integration)
```
✅ [WebSocketContext] Initialized for user: ...
✅ [Socket.IO] Connected
✅ [ActivityTracker] Initialized for user: xxx
✅ [ActivityTracker] Message sent tracked
✅ [ActivityTracker] File shared tracked: filename
✅ [ActivityTracker] Room joined tracked
```

#### Bad Signs (Issues to Fix)
```
❌ [Error] Failed to initialize ActivityTracker
❌ [Error] Socket.IO connection failed
❌ [TypeError] Cannot read property 'emit' of undefined
❌ [Error] PageLayout component not found
```

### Network Tab Analysis

#### Good Activity Batch Event
```
Type: WS (WebSocket)
Name: activity-batch
Payload: {
  "events": [
    { "type": "message-sent", "roomId": "xxx", ... },
    { "type": "file-shared", "roomId": "xxx", ... }
  ]
}
Status: 200 OK
```

#### Bad Signs
```
❌ No activity-batch events appearing
❌ activity-batch events failing (4xx or 5xx status)
❌ Socket.IO connection errors
```

---

## Performance Verification

### Load Time Targets
| Page | Target | How to Measure |
|------|--------|----------------|
| Home | < 2s | DevTools Network → Page load time |
| Dashboard | < 1.5s | Check "Total" time |
| Room | < 2s | Watch page load |
| Intelligence | < 2s | Verify metrics load quickly |

**How to Check:**
1. Open DevTools Network tab
2. Go to specific page
3. Check "Total" time (shown at bottom)
4. Should be under target

### Memory Usage
```javascript
// In DevTools Console
performance.memory
// Check usedJSHeapSize vs jsHeapSizeLimit
// Should be < 100MB for this app
```

---

## Testing Checklist - Fill As You Test

### Build Phase
- [ ] `npm run build` completes successfully
- [ ] No TypeScript errors
- [ ] 24+ asset files generated
- [ ] Build time < 10 seconds

### Dev Server Phase
- [ ] `npm run dev` starts successfully
- [ ] Both [client] and [server] ready
- [ ] No startup errors
- [ ] Takes < 15 seconds to start

### Page Loading Phase
- [ ] Home page loads without errors
- [ ] Dashboard loads with navbar/sidebar
- [ ] All 4 wrapped pages load correctly
- [ ] Console shows no errors on any page

### Navigation Phase
- [ ] Can navigate between pages via sidebar
- [ ] Navigation is smooth (no flicker)
- [ ] URL updates correctly
- [ ] No full page reloads (check Network tab)

### Layout Phase
- [ ] Navbar visible on all pages
- [ ] Sidebar visible on desktop
- [ ] Sidebar hidden on mobile
- [ ] Content properly spaced and readable

### Activity Tracking Phase
- [ ] Activity Tracker initializes on load
- [ ] Messages tracked when sent
- [ ] Files tracked when uploaded
- [ ] Rooms tracked when joined
- [ ] Server receives activity-batch events

### Responsive Phase
- [ ] Desktop layout (1920px) works
- [ ] Tablet layout (768px) works
- [ ] Mobile layout (375px) works
- [ ] Orientation changes work smoothly

### Integration Phase
- [ ] Full user workflow completes
- [ ] Intelligence page shows correct metrics
- [ ] Game flow works smoothly
- [ ] No features broken from Phase 3/4

### Performance Phase
- [ ] Page loads in under target time
- [ ] Memory usage reasonable (< 100MB)
- [ ] Activity tracking responsive (< 100ms)
- [ ] No memory leaks on navigation

---

## Common Issues & Solutions

### Issue: "PageLayout not found"
**Solution:**
1. Check file exists: `src/components/PageLayout.tsx`
2. Check import path in pages
3. Rebuild: `npm run build`

### Issue: "Sidebar import error"
**Solution:**
1. Verify import: `import { Sidebar } from './layout/Sidebar'`
2. Check named export in Sidebar.tsx
3. Rebuild project

### Issue: Activity tracking not logging
**Solution:**
1. Check user is logged in
2. Check Socket.IO is connected
3. Look for errors in console
4. Check server is running

### Issue: Full page reload on navigation
**Solution:**
1. Verify useNavigate imported from react-router-dom
2. Check navigate() called instead of window.location
3. Review Games.tsx and RandomLanding.tsx changes
4. Rebuild and test again

### Issue: No "activity-batch" in Network tab
**Solution:**
1. Perform an activity (send message)
2. Check WebSocket connection is active
3. Look at both WS and XHR in Network tab
4. Check server logs for activity handler

---

## Test Report Template

```markdown
# Phase 5 Test Report
**Date:** [Date]
**Tester:** [Name]
**Build:** [Build number]

## Results Summary
- Build Status: ✅ PASS
- Page Loading: ✅ PASS
- SPA Navigation: ✅ PASS
- Activity Tracking: ✅ PASS
- Responsive Design: ✅ PASS
- Overall: ✅ PASS

## Issues Found
[List any issues]

## Recommendations
[List recommendations]

## Sign-Off
Ready for Phase 6: [YES/NO]
```

---

## Quick Commands Reference

```powershell
# Build for production
npm run build

# Start development server
npm run dev

# Start only client dev
npm run dev:client

# Start only server dev
npm run dev:server

# Run tests (if configured)
npm test

# Check for errors
npm run lint

# Type check
npm run type-check
```

---

**Phase 5 Execution Guide Complete**
Ready to begin testing whenever you're ready!
