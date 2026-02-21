# 📊 ACTIVITY PAGE - IMPLEMENTATION PLAN

## 🎯 Purpose

Answer one question perfectly: **"What happened in my rooms?"**

Clarity, continuity, and confidence.

---

## 🧭 Navigation Integration

**Add to Navbar:**

- Label: "Activity"
- Icon: `Clock` (from lucide-react)
- Route: `/activity`
- Position: Between "Dashboard" and "Feedback"

---

## 🧱 Page Structure

### **1. Header**

```tsx
<h1>Activity</h1>
<p>Your recent room activity and interactions</p>
<div className="w-12 h-px bg-primary" /> // 1px gold underline
```

### **2. Filters (Horizontal Pills)**

```tsx
const filters = ['All', 'Rooms', 'Presentations', 'Games', 'Media', 'Feedback'];
// Active: gold outline
// Inactive: muted gray
```

### **3. Activity Timeline**

```tsx
// Vertical timeline with cards
// Gold dot on left
// Card content on right
```

---

## 🧾 Activity Card Types

### **1. Room Session**

```tsx
{
  type: 'room',
  title: 'Cospira Room',
  subtitle: 'Hosted by You',
  action: 'You started a room',
  timestamp: '12 Jan 2026 • 8:42 PM',
  duration: '18 minutes',
  participants: 3,
}
```

### **2. Presentation**

```tsx
{
  type: 'presentation',
  title: 'Presentation',
  action: 'You shared a document',
  file: 'LAW252.pdf',
  timestamp: '12 Jan 2026 • 8:55 PM',
}
```

### **3. Game**

```tsx
{
  type: 'game',
  title: 'Game Session',
  action: 'You played a game',
  game: 'Tic-Tac-Toe',
  timestamp: '12 Jan 2026 • 9:02 PM',
}
```

### **4. Browser/Media**

```tsx
{
  type: 'browser',
  title: 'Media Activity',
  action: 'You browsed content',
  detail: 'Private browser session',
  timestamp: '12 Jan 2026 • 9:10 PM',
}
```

---

## 🔑 Card Behavior

**Hover Effects:**

- Lift 2px
- Soft gold border glow
- Cursor pointer
- Show "↗ Open related room" (right side)

---

## 🌟 Luxury Upgrades

### **1. Grouped Sessions** ⭐ CRITICAL

```tsx
{
  type: 'session-group',
  title: 'Room Session — 12 Jan 2026',
  activities: [
    'Room created',
    'Presentation shared',
    'Game played',
    'Browser used',
  ],
}
```

### **2. Resume Action** ⭐ HIGH VALUE

```tsx
// On latest session only
<Button variant='outline' className='border-primary'>
  Resume Room
</Button>
```

### **3. Empty State**

```tsx
<div className='text-center'>
  <h3>No activity yet</h3>
  <p>Your room interactions will appear here once you start</p>
  <Button variant='outline'>Create your first room</Button>
</div>
```

### **4. Privacy Message**

```tsx
<p className='text-xs text-white/20'>Only you can see your activity history</p>
```

---

## 🎨 Design System

### **Colors:**

- Background: `bg-[#020408]` (deep black)
- Cards: `bg-white/5` (dark gray)
- Gold: `text-primary` / `border-primary`
- Timeline dots: `bg-primary`

### **Gold Usage:**

- ✅ Timeline dots
- ✅ Active filters
- ✅ "Resume Room" button
- ✅ "Hosted by You" text
- ❌ Never gold-fill entire cards

### **Typography:**

- Title: `text-xl font-bold`
- Subtitle: `text-sm text-white/60`
- Timestamp: `text-xs text-white/40`

---

## 🧠 Data Structure

### **Backend Schema (Future)**

```typescript
interface ActivitySession {
  session_id: string;
  started_at: string; // ISO timestamp
  ended_at: string | null;
  duration: number; // minutes
  role: 'host' | 'participant';
  activities_used: ('game' | 'browser' | 'pdf' | 'youtube' | 'screen')[];
  participants_count: number;
  room_id: string;
  room_name: string;
}
```

### **Frontend Data (Mock for now)**

```typescript
const mockActivities: Activity[] = [
  {
    id: '1',
    type: 'room',
    title: 'Cospira Room',
    subtitle: 'Hosted by You',
    action: 'You started a room',
    timestamp: new Date('2026-01-12T20:42:00'),
    duration: 18,
    participants: 3,
    roomId: 'ABC123',
  },
  // ... more activities
];
```

---

## 📁 File Structure

```
src/
├── pages/
│   └── Activity.tsx          // Main page component
├── components/
│   ├── activity/
│   │   ├── ActivityCard.tsx  // Individual card
│   │   ├── ActivityFilters.tsx
│   │   ├── ActivityTimeline.tsx
│   │   └── EmptyState.tsx
├── types/
│   └── activity.ts           // TypeScript types
└── utils/
    └── activityHelpers.ts    // Helper functions
```

---

## 🚀 Implementation Steps

### **Step 1: Create Types**

- Define Activity interface
- Define filter types
- Export types

### **Step 2: Create Components**

- ActivityCard (with hover effects)
- ActivityFilters (pill style)
- ActivityTimeline (vertical layout)
- EmptyState

### **Step 3: Create Main Page**

- Header with gold underline
- Filters integration
- Timeline rendering
- Empty state handling

### **Step 4: Add Navigation**

- Update Navbar
- Add route to App.tsx
- Add icon

### **Step 5: Mock Data**

- Create sample activities
- Test all card types
- Test grouped sessions

### **Step 6: Polish**

- Hover effects
- Animations
- Responsive design
- Privacy message

---

## ⏱ Estimated Time

- **Types & Structure:** 15 min
- **Components:** 45 min
- **Main Page:** 30 min
- **Navigation:** 10 min
- **Mock Data:** 15 min
- **Polish:** 15 min

**Total:** ~2 hours

---

## 🎯 Success Criteria

- [ ] Page loads without errors
- [ ] All card types render correctly
- [ ] Filters work (visual only for now)
- [ ] Hover effects smooth
- [ ] Empty state shows when no data
- [ ] Resume button on latest session
- [ ] Privacy message at bottom
- [ ] Responsive on mobile
- [ ] Matches design system
- [ ] Gold usage consistent

---

## 🔮 Future Enhancements

1. **Backend Integration**
   - Connect to real session data
   - Store activities in Supabase
   - Real-time updates

2. **Advanced Filtering**
   - Date range picker
   - Search functionality
   - Sort options

3. **Export**
   - Download activity report
   - Share activity summary

4. **Analytics**
   - Most used features
   - Total time in rooms
   - Activity trends

---

**Status:** Ready to implement  
**Priority:** HIGH  
**Impact:** Retention, clarity, confidence
