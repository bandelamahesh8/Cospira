# Room Page Upgrade Status

## ✅ Already Implemented (Found in Current Code)

### RoomControls.tsx

- ✅ **Tooltips on all controls** (Upgrade #2) - COMPLETE
  - Mic: "Audio Active/Muted"
  - Video: "Video Active/Offline"
  - Screen Share: "Share Protocol"
  - Games: "Login to Play"
  - Chat: "Open Comm-Link"
  - End: "Terminate Arena/Disconnect Link"
  - All have 300ms delay via `delayDuration={0}` on TooltipProvider

- ✅ **Adaptive Control Emphasis** (Upgrade #5) - COMPLETE
  - Mic button: Red background when muted
  - Video button: Red background when off
  - Green pulse dot when active

- ✅ **End-Session Safety Cue** (Upgrade #10) - COMPLETE
  - Tooltip shows: "Terminate Arena" (host) or "Disconnect Link" (participant)

### Room.tsx

- ✅ **Participant presence in header** (Upgrade #3) - PARTIAL
  - Shows participant avatars in header
  - Need to add "X participants • Live/You" text

---

## 🔨 Still Need to Implement

### Priority 1: Core Missing Features

#### 1. Empty-Stage Guidance (Upgrade #1)

**File:** VideoGrid.tsx  
**Status:** ❌ NOT IMPLEMENTED

```tsx
// Add to VideoGrid when users.length === 1
{
  users.length === 1 && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}
      className='absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10'
    >
      <p className='text-muted-foreground/40 text-sm'>Waiting for others to join…</p>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 6 }}
        className='text-muted-foreground/40 text-xs mt-2'
      >
        Share the room link to invite participants
      </motion.p>
    </motion.div>
  );
}
```

#### 2. Participant Presence Indicator (Upgrade #3)

**File:** Room.tsx (header section)  
**Status:** ❌ NEEDS ENHANCEMENT

Add after line 226 (after activity status):

```tsx
<div className='hidden sm:flex items-center gap-2 text-xs'>
  <span className='text-muted-foreground'>
    {users.length} participant{users.length !== 1 ? 's' : ''}
  </span>
  <span className='text-muted-foreground'>•</span>
  {users.length > 1 ? (
    <span className='text-green-400 font-bold'>Live</span>
  ) : (
    <span className='text-muted-foreground'>You</span>
  )}
</div>
```

#### 3. Connection Readiness Cue (Upgrade #4)

**File:** Room.tsx (top-left of stage area)  
**Status:** ❌ NOT IMPLEMENTED

Add near line 301 (inside stage area):

```tsx
<Tooltip>
  <TooltipTrigger asChild>
    <div
      className={`absolute top-4 left-4 w-2 h-2 rounded-full z-20 ${
        isConnected ? 'bg-green-500' : 'bg-yellow-500'
      } shadow-lg`}
    />
  </TooltipTrigger>
  <TooltipContent side='right' className='text-xs'>
    {isConnected ? 'Audio and video ready' : 'Connecting…'}
  </TooltipContent>
</Tooltip>
```

---

### Priority 2: Luxury Features

#### 4. Keyboard Shortcuts (Upgrade #7)

**File:** Room.tsx  
**Status:** ❌ NOT IMPLEMENTED

Add useEffect after line 119:

```tsx
const [shortcutHint, setShortcutHint] = useState<string | null>(null);
const [shortcutUsed, setShortcutUsed] = useState<Set<string>>(new Set());

useEffect(() => {
  const handleKeyPress = (e: KeyboardEvent) => {
    // Don't trigger if typing in input
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextarea) return;

    const key = e.key.toLowerCase();

    switch (key) {
      case 'm':
        toggleAudio();
        if (!shortcutUsed.has('m')) {
          setShortcutHint('Press M to mute');
          setShortcutUsed((prev) => new Set(prev).add('m'));
          setTimeout(() => setShortcutHint(null), 2000);
        }
        break;
      case 'v':
        toggleVideo();
        if (!shortcutUsed.has('v')) {
          setShortcutHint('Press V to toggle camera');
          setShortcutUsed((prev) => new Set(prev).add('v'));
          setTimeout(() => setShortcutHint(null), 2000);
        }
        break;
      case 's':
        if (canShareScreen) {
          handleToggleScreenShare();
          if (!shortcutUsed.has('s')) {
            setShortcutHint('Press S to share screen');
            setShortcutUsed((prev) => new Set(prev).add('s'));
            setTimeout(() => setShortcutHint(null), 2000);
          }
        }
        break;
    }
  };

  window.addEventListener('keydown', handleKeyPress);
  return () => window.removeEventListener('keydown', handleKeyPress);
}, [toggleAudio, toggleVideo, handleToggleScreenShare, canShareScreen, shortcutUsed]);

// Add shortcut hint display
{
  shortcutHint && (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className='fixed bottom-24 left-1/2 -translate-x-1/2 bg-black/90 text-white px-4 py-2 rounded-lg text-xs z-50'
    >
      {shortcutHint}
    </motion.div>
  );
}
```

#### 5. Invite Affordance (Upgrade #8)

**File:** RoomControls.tsx  
**Status:** ❌ NOT IMPLEMENTED

Add state and effect:

```tsx
const [showInviteGlow, setShowInviteGlow] = useState(false);

useEffect(() => {
  if (participantCount === 1) {
    const timer = setTimeout(() => setShowInviteGlow(true), 10000);
    return () => clearTimeout(timer);
  } else {
    setShowInviteGlow(false);
  }
}, [participantCount]);

// Add to invite button (around line 209):
<button className='relative'>
  {showInviteGlow && (
    <motion.div
      animate={{ opacity: [0.3, 0.6, 0.3] }}
      transition={{ duration: 2, repeat: Infinity }}
      className='absolute inset-0 rounded-full bg-primary/30 blur-sm'
    />
  )}
  <Copy className='w-5 h-5' />
</button>;
```

#### 6. In-Room Status Micro-Banner (Upgrade #9)

**File:** Room.tsx  
**Status:** ❌ NOT IMPLEMENTED

Add after line 296 (inside main):

```tsx
const [showStatusBanner, setShowStatusBanner] = useState(true);

useEffect(() => {
  const timer = setTimeout(() => setShowStatusBanner(false), 2000);
  return () => clearTimeout(timer);
}, []);

// In JSX:
<AnimatePresence>
  {showStatusBanner && (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className='absolute top-4 left-1/2 -translate-x-1/2 bg-green-500/10 border border-green-500/20 px-4 py-2 rounded-full text-xs text-green-400 z-50'
    >
      You're live and secure
    </motion.div>
  )}
</AnimatePresence>;
```

---

### Priority 3: Polish Features

#### 7. Pin/Focus Clarity (Upgrade #6)

**File:** DraggableParticipantStrip.tsx or VideoTile.tsx  
**Status:** ❌ NOT IMPLEMENTED  
**Note:** Requires pin functionality to be implemented first

#### 8. Ambient Motion Discipline (Upgrade #11)

**File:** Room.tsx (background)  
**Status:** ❌ NOT IMPLEMENTED

Replace static background gradient with:

```tsx
<motion.div
  animate={{
    background: [
      'radial-gradient(circle at 20% 50%, rgba(0,200,255,0.02) 0%, transparent 70%)',
      'radial-gradient(circle at 80% 50%, rgba(0,200,255,0.02) 0%, transparent 70%)',
      'radial-gradient(circle at 20% 50%, rgba(0,200,255,0.02) 0%, transparent 70%)',
    ],
  }}
  transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
  className='absolute inset-0 pointer-events-none'
/>
```

#### 9. Accessibility & Focus Polish (Upgrade #12)

**Files:** All interactive components  
**Status:** ❌ NOT IMPLEMENTED

Add to all buttons:

- `aria-label` attributes
- `tabIndex` for logical tab order
- `className="focus-visible:ring-2 focus-visible:ring-primary/50"`

---

## Summary

**Completed:** 3/12 upgrades (25%)

- ✅ Control bar tooltips
- ✅ Adaptive control emphasis
- ✅ End-session safety cue

**Remaining:** 9/12 upgrades (75%)

- ❌ Empty-stage guidance
- ❌ Participant presence indicator (needs enhancement)
- ❌ Connection readiness cue
- ❌ Keyboard shortcuts
- ❌ Invite affordance
- ❌ In-room status banner
- ❌ Pin/focus clarity
- ❌ Ambient motion discipline
- ❌ Accessibility polish

**Next Steps:**

1. Implement Priority 1 features (empty state, participant count, connection status)
2. Add Priority 2 features (keyboard shortcuts, invite glow, status banner)
3. Polish with Priority 3 features (ambient motion, accessibility)
