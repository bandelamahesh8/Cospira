# Phase 4 - Line-by-Line Change Log

## Client-Side Changes

### 1. WebSocketContext.tsx (4 modifications)

#### Change 1: Import ActivityTracker
**Location:** Line 9
**Before:**
```typescript
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePresence } from '@/hooks/usePresence';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { SignalingService } from '@/services/SignalingService';
import { SFUManager } from '@/services/SFUManager';
import { RoomSocketService } from '@/domains/rooms';
import { logger } from '@/utils/logger';
```

**After:**
```typescript
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePresence } from '@/hooks/usePresence';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { SignalingService } from '@/services/SignalingService';
import { SFUManager } from '@/services/SFUManager';
import { RoomSocketService } from '@/domains/rooms';
import { ActivityTracker } from '@/services/ActivityTracker';  // ← NEW
import { logger } from '@/utils/logger';
```

#### Change 2: Create ActivityTracker Ref
**Location:** Line 101 (after sfuManagerRef)
**Before:**
```typescript
const signalingRef = useRef<SignalingService | null>(null);
const sfuManagerRef = useRef<SFUManager | null>(null);

// Presence Detection (60s timeout) - must be declared before use
```

**After:**
```typescript
const signalingRef = useRef<SignalingService | null>(null);
const sfuManagerRef = useRef<SFUManager | null>(null);
const activityTrackerRef = useRef<ActivityTracker | null>(null);  // ← NEW

// Presence Detection (60s timeout) - must be declared before use
```

#### Change 3: Initialize ActivityTracker
**Location:** Lines 253-258 (in connection setup effect)
**Before:**
```typescript
logger.info('Initializing WebSocket connection to:', wsUrl);

signalingRef.current = new SignalingService(wsUrl);
roomServiceRef.current = new RoomSocketService(signalingRef.current);

setupSfuManager();
```

**After:**
```typescript
logger.info('Initializing WebSocket connection to:', wsUrl);

signalingRef.current = new SignalingService(wsUrl);
roomServiceRef.current = new RoomSocketService(signalingRef.current);

// Initialize ActivityTracker with user info                    // ← NEW
if (user?.id && signalingRef.current) {                        // ← NEW
  activityTrackerRef.current = new ActivityTracker(            // ← NEW
    user.id,                                                    // ← NEW
    signalingRef.current                                        // ← NEW
  );                                                            // ← NEW
  activityTrackerRef.current.initialize();                     // ← NEW
}                                                               // ← NEW

setupSfuManager();
```

#### Change 4A: Track Message Sent
**Location:** Line 642 (in sendMessage callback)
**Before:**
```typescript
signalingRef.current?.emit('send-message', messageData, (response?: { success: boolean }) => {
  if (!response?.success) {
    toast({ title: 'Error', description: 'Failed to send message', variant: 'destructive' });
  }
});
```

**After:**
```typescript
signalingRef.current?.emit('send-message', messageData, (response?: { success: boolean }) => {
  if (response?.success) {                                      // ← MODIFIED
    // Track message sent activity                             // ← NEW
    if (activityTrackerRef.current && state.roomId) {         // ← NEW
      activityTrackerRef.current.trackMessageSent(            // ← NEW
        state.roomId                                           // ← NEW
      );                                                        // ← NEW
    }                                                           // ← NEW
  } else {                                                      // ← MODIFIED
    toast({ title: 'Error', description: 'Failed to send message', variant: 'destructive' });
  }
});
```

#### Change 4B: Track File Shared
**Location:** Line 668 (in uploadFile callback)
**Before:**
```typescript
signalingRef.current?.emit('upload-file', 
  { roomId: state.roomId!, file: fileData }, 
  (response?: { success: boolean; error?: string }) => {
    if (response?.success) {
      resolve(true);
    } else {
      toast({ title: 'Upload Failed', description: response?.error || 'Unknown error', variant: 'destructive' });
      resolve(false);
    }
  }
);
```

**After:**
```typescript
signalingRef.current?.emit('upload-file', 
  { roomId: state.roomId!, file: fileData }, 
  (response?: { success: boolean; error?: string }) => {
    if (response?.success) {
      // Track file sharing activity                           // ← NEW
      if (activityTrackerRef.current && state.roomId) {       // ← NEW
        activityTrackerRef.current.trackFileShared(           // ← NEW
          state.roomId,                                        // ← NEW
          file.name                                            // ← NEW
        );                                                      // ← NEW
      }                                                         // ← NEW
      resolve(true);
    } else {
      toast({ title: 'Upload Failed', description: response?.error || 'Unknown error', variant: 'destructive' });
      resolve(false);
    }
  }
);
```

#### Change 4C: Track Room Joined
**Location:** Line 463 (in joinRoom callback)
**Before:**
```typescript
} else if (response.room) {
  logger.info('[WebSocketContext] Join room callback received, waiting for room-joined event');
  if (onSuccess) onSuccess();
}
```

**After:**
```typescript
} else if (response.room) {
  logger.info('[WebSocketContext] Join room callback received, waiting for room-joined event');
  // Track room joined activity                                // ← NEW
  if (activityTrackerRef.current) {                           // ← NEW
    activityTrackerRef.current.trackRoomJoined(roomId);       // ← NEW
  }                                                             // ← NEW
  if (onSuccess) onSuccess();
}
```

---

### 2. AIInsightsPage.tsx (2 changes)

#### Change 1: Add PageLayout Import
**Location:** Line 4
**Before:**
```typescript
import { motion } from 'framer-motion';
import { Brain, TrendingUp, Target, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export const AIInsightsPage = () => {
```

**After:**
```typescript
import { motion } from 'framer-motion';
import { Brain, TrendingUp, Target, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { PageLayout } from '@/components/PageLayout';  // ← NEW

export const AIInsightsPage = () => {
```

#### Change 2: Wrap with PageLayout
**Location:** Line 8
**Before:**
```typescript
return (
  <div className="min-h-screen bg-[#05070a] text-white p-8">
```

**After:**
```typescript
return (
  <PageLayout showNavbar showSidebar>  {/* ← NEW */}
    <div className="bg-[#05070a] text-white p-8">
```

#### Change 3: Close PageLayout Wrapper
**Location:** Last lines
**Before:**
```typescript
      </motion.div>
    </div>
  );
};
```

**After:**
```typescript
      </motion.div>
    </div>
  </PageLayout>  {/* ← NEW */}
  );
};
```

---

### 3. UpcomingFeatures.tsx (3 changes)

#### Change 1: Replace Navbar Import with PageLayout
**Location:** Lines 1-3
**Before:**
```typescript
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import { 
```

**After:**
```typescript
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PageLayout } from '@/components/PageLayout';  // ← CHANGED
import { 
```

#### Change 2: Wrap with PageLayout (remove Navbar)
**Location:** Lines 72-86
**Before:**
```typescript
return (
  <div className='min-h-[100dvh] bg-[#05070a] relative overflow-hidden selection:bg-indigo-500/30 font-sans text-white flex flex-col'>
    {/* Background */}
    <div className="fixed inset-0 pointer-events-none z-0">
       <div className="absolute top-0 right-[-10%] w-[50%] h-[50%] bg-pink-600/5 blur-[150px] rounded-full mix-blend-screen" />
       <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/5 blur-[150px] rounded-full mix-blend-screen" />
       <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.02]" />
    </div>

    <div className="relative z-10 flex flex-col flex-1 h-full">
        <Navbar />
        
        <main className='flex-1 container mx-auto px-4 md:px-8 py-24 max-w-5xl'>
```

**After:**
```typescript
return (
  <PageLayout showNavbar showSidebar>  {/* ← NEW */}
    <div className='bg-[#05070a] text-white flex-1'>
      <div className="absolute inset-0 pointer-events-none z-0">
         <div className="absolute top-0 right-[-10%] w-[50%] h-[50%] bg-pink-600/5 blur-[150px] rounded-full mix-blend-screen" />
         <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/5 blur-[150px] rounded-full mix-blend-screen" />
         <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.02]" />
      </div>

      <div className="relative z-10 flex flex-col flex-1 h-full">
          <main className='flex-1 container mx-auto px-4 md:px-8 py-24 max-w-5xl'>
```

#### Change 3: Close PageLayout
**Location:** End of return
**Before:**
```typescript
                </main>
            </div>
        </div>
    );
};
```

**After:**
```typescript
                </main>
            </div>
        </div>
  </PageLayout>  {/* ← NEW */}
  );
};
```

---

### 4. Settings.tsx (2 changes)

#### Change 1: Add PageLayout Import
**Location:** Line 3
**Before:**
```typescript
import { motion } from 'framer-motion';
import { Settings as SettingsIcon } from 'lucide-react';

const Settings = () => {
```

**After:**
```typescript
import { motion } from 'framer-motion';
import { Settings as SettingsIcon } from 'lucide-react';
import { PageLayout } from '@/components/PageLayout';  // ← NEW

const Settings = () => {
```

#### Change 2: Wrap with PageLayout
**Location:** Line 6
**Before:**
```typescript
return (
  <div className="p-8 min-h-screen pt-24 text-white">
    <motion.div 
```

**After:**
```typescript
return (
  <PageLayout showNavbar showSidebar>  {/* ← NEW */}
    <div className="min-h-screen text-white p-8">
      <motion.div 
```

#### Change 3: Close Wrapper
**Location:** End
**Before:**
```typescript
        </div>
    </div>
);
```

**After:**
```typescript
        </div>
    </div>
  </PageLayout>  {/* ← NEW */}
);
```

---

### 5. Profile.tsx (3 changes)

#### Change 1: Replace Navbar with PageLayout
**Location:** Lines 1-7
**Before:**
```typescript
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import Navbar from '@/components/Navbar';
import { ForgotPasswordModal } from '@/components/auth/ForgotPasswordModal';
```

**After:**
```typescript
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { PageLayout } from '@/components/PageLayout';  // ← CHANGED
import { ForgotPasswordModal } from '@/components/auth/ForgotPasswordModal';
```

#### Change 2: Wrap with PageLayout (remove Navbar call)
**Location:** Line 223 → Line 245
**Before:**
```typescript
return (
  <div className='min-h-screen bg-[#05070a] relative overflow-x-hidden selection:bg-indigo-500/30 font-sans text-white'>
    {/* BACKGROUND EFFECTS */}
    ...
    <div className="relative z-10 flex flex-col min-h-screen">
      <Navbar />

      <div className='container mx-auto px-4 md:px-8 py-20 md:py-32 max-w-4xl flex-1'>
```

**After:**
```typescript
return (
  <PageLayout showNavbar showSidebar>  {/* ← NEW */}
  <div className='bg-[#05070a] text-white'>
    {/* BACKGROUND EFFECTS */}
    ...
    <div className="relative z-10 flex flex-col min-h-screen">
      <div className='container mx-auto px-4 md:px-8 py-20 md:py-32 max-w-4xl flex-1'>
```

#### Change 3: Close PageLayout
**Location:** End of return
**Before:**
```typescript
        onClose={() => setShowForgotPassword(false)} 
        initialEmail={userEmail}
    />
  </div>
);
};
```

**After:**
```typescript
        onClose={() => setShowForgotPassword(false)} 
        initialEmail={userEmail}
    />
  </div>
  </PageLayout>  {/* ← NEW */}
);
};
```

---

### 6. Games.tsx (2 changes)

#### Change 1: Add useNavigate Import
**Location:** Line 1
**Before:**
```typescript
import { useAuth } from '@/hooks/useAuth';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { useState, useEffect } from 'react';
```

**After:**
```typescript
import { useNavigate } from 'react-router-dom';  // ← NEW
import { useAuth } from '@/hooks/useAuth';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { useState, useEffect } from 'react';
```

#### Change 2: Add navigate declaration and fix navigation
**Location:** Line 36 and Line 113
**Before:**
```typescript
export const Games = () => {
  const { user } = useAuth();
  const { playHover } = useSoundEffects();
  ...
  
  const onMatchFound = (data: { roomId: string; gameType: string; mode: string }) => {
    window.location.href = `/room/${data.roomId}?game=${data.gameType}&mode=${data.mode}`;
  };
```

**After:**
```typescript
export const Games = () => {
  const navigate = useNavigate();  // ← NEW
  const { user } = useAuth();
  const { playHover } = useSoundEffects();
  ...
  
  const onMatchFound = (data: { roomId: string; gameType: string; mode: string }) => {
    navigate(`/room/${data.roomId}?game=${data.gameType}&mode=${data.mode}`);  // ← CHANGED
  };
```

---

### 7. RandomLanding.tsx (1 change)

#### Change: Replace window.location.reload with navigate
**Location:** Line 255
**Before:**
```typescript
const handleGoHome = () => {
  window.location.reload();
};
```

**After:**
```typescript
const handleGoHome = () => {
  navigate(0);  // ← CHANGED
};
```

---

## Server-Side Changes

### analytics.socket.js (1 addition)

#### Add Activity-Batch Handler
**Location:** Before closing brace (after weekly report handler)
**Added:** 38 lines
```javascript
/**
 * Batch activity logging from clients
 */
socket.on('activity-batch', async (data, callback) => {
  try {
    const { events } = data;
    const userId = socket.user?.id;

    if (!userId || !events || !Array.isArray(events)) {
      return callback?.({ success: false, error: 'Invalid activity data' });
    }

    logger.info(`[Analytics] Received ${events.length} activity events from user ${userId}`);
    
    // Track each event in analytics system
    for (const event of events) {
      await analyticsService.trackActivity({
        userId,
        type: event.type,
        roomId: event.roomId,
        metadata: event.metadata,
        duration: event.duration,
        timestamp: event.timestamp || new Date()
      });
    }

    callback?.({ success: true });
  } catch (error) {
    logger.error('[Analytics] Error logging activity batch:', error);
    callback?.({
      success: false,
      error: error.message
    });
  }
});
```

---

## Summary

| File | Type | Changes |
|------|------|---------|
| WebSocketContext.tsx | Client | 4 modifications (imports + refs + init + 3x tracking) |
| AIInsightsPage.tsx | Client | 3 modifications (import + wrap start + wrap end) |
| UpcomingFeatures.tsx | Client | 3 modifications (import + wrap + cleanup) |
| Settings.tsx | Client | 3 modifications (import + wrap start + wrap end) |
| Profile.tsx | Client | 3 modifications (import + wrap + cleanup) |
| Games.tsx | Client | 2 modifications (import + navigate call) |
| RandomLanding.tsx | Client | 1 modification (navigate instead of reload) |
| **analytics.socket.js** | **Server** | **1 addition (38 lines)** |

**Total Changes:** 22 modifications + 1 major addition

---

**Phase 4 Line-by-Line Tracking Complete** ✅
