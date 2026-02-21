# Room UX Polish Implementation Plan

## Overview

Implementing 6 core features + 3 micro-polish improvements to enhance user experience with translation layer, trust cues, and session memory.

---

## ✅ Implementation Checklist

### **Phase 1: First-Time Translation Layer**

- [ ] Add localStorage helper for first-time flags
- [ ] Add tooltip to "Manifest Content" (OTT modal)
- [ ] Add tooltip to "Combat Stations" (Game selector)
- [ ] Add tooltip to "Arena Overlord" role label
- [ ] Auto-dismiss after first interaction

### **Phase 2: Game Mode Feedback**

- [ ] Update status bar when game active
- [ ] Add "🎮 Game mode active" text
- [ ] Add subtle background hue shift (5-8%)
- [ ] Revert on game exit

### **Phase 3: Browser/Projection Trust Cue**

- [ ] Add "Private session • Not recorded" badge
- [ ] Show only during Browser/Video/PDF projection
- [ ] Add tooltip: "Content is streamed privately to this room"
- [ ] Position top-right near LIVE indicator

### **Phase 4: Session Timeline Memory (Backend)**

- [ ] Create session events array structure
- [ ] Track video/game/document events
- [ ] Add timestamps
- [ ] Store per session (future-ready, no UI yet)

### **Phase 5: End-Session Summary**

- [ ] Create summary modal component
- [ ] Show on "End Session" / "Leave Room"
- [ ] Display: presentations, games, duration
- [ ] Add "Thanks for using Cospira Rooms"
- [ ] Show once per session

### **Phase 6: Soft Onboarding**

- [ ] Create first-time overlay
- [ ] Show "This is your room. Everything happens here."
- [ ] Auto-dismiss after 3s OR first interaction
- [ ] Never show again (localStorage)

### **Phase 7: Bonus Micro-Polish**

- [ ] Game cards hover state: "Ready to play"
- [ ] Projection close tooltip: "Stop sharing"
- [ ] Standardize status verbs: Browsing, Presenting, Playing

---

## 📁 Files to Create/Modify

### New Files:

1. `src/utils/firstTimeHelpers.ts` - localStorage utilities
2. `src/components/room/SessionSummaryModal.tsx` - End session summary
3. `src/components/room/SoftOnboarding.tsx` - First-time overlay

### Modified Files:

1. `src/pages/Room.tsx` - Game mode feedback, trust cue, onboarding
2. `src/components/room/RoomControls.tsx` - Role label tooltip
3. `src/components/OTTGridModal.tsx` - "Manifest Content" tooltip
4. `src/components/games/GameSelector.tsx` - "Combat Stations" tooltip, hover states
5. `src/components/room/FilePresenter.tsx` - Close tooltip
6. `src/contexts/WebSocketContext.tsx` - Session timeline tracking

---

## 🎯 Implementation Order

**Priority 1 (High Impact, Low Effort):**

1. First-time translation layer (tooltips)
2. Browser/projection trust cue
3. Bonus micro-polish (hover states, tooltips)

**Priority 2 (Medium Impact, Medium Effort):** 4. Game mode feedback 5. Soft onboarding

**Priority 3 (Future-Ready):** 6. Session timeline memory (backend only) 7. End-session summary

---

## 🚀 Let's Start!

I'll implement these in order of priority, starting with the translation layer and trust cues.
