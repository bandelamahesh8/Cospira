# CLIENT-SIDE INTEGRATION GUIDE

**Version**: Phases 0-2
**Last Updated**: 2026-01-10

---

## 🎯 OVERVIEW

This guide shows how to integrate the backend features (Phases 0-2) into your React client.

---

## 📦 REQUIRED PACKAGES

```bash
npm install socket.io-client axios date-fns
```

---

## 🔌 SOCKET CONNECTION

### `src/services/socket.ts`

```typescript
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SERVER_URL || 'https://localhost:3001';

class SocketService {
  private socket: Socket | null = null;

  connect(token?: string) {
    if (this.socket?.connected) return this.socket;

    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],
      auth: token ? { token } : undefined,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket connected:', this.socket?.id);
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    return this.socket;
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  getSocket() {
    return this.socket;
  }
}

export default new SocketService();
```

---

## 🪝 REACT HOOKS

### `src/hooks/useRoomMemory.ts`

```typescript
import { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';

interface LastSessionSummary {
  sessionId: string;
  endedAt: Date;
  duration: number;
  bullets: string[];
  actionItemsCount: number;
  decisionsCount: number;
}

interface PendingItemsReminder {
  count: number;
  actionsCount: number;
  decisionsCount: number;
  actions: any[];
  decisions: any[];
}

interface LateJoinSummary {
  isLateJoin: boolean;
  sessionDuration: number;
  summaryDuration: number;
  summary: string;
  bullets: string[];
}

export function useRoomMemory(socket: Socket | null, roomId: string) {
  const [lastSession, setLastSession] = useState<LastSessionSummary | null>(null);
  const [pendingItems, setPendingItems] = useState<PendingItemsReminder | null>(null);
  const [lateJoinSummary, setLateJoinSummary] = useState<LateJoinSummary | null>(null);

  useEffect(() => {
    if (!socket || !roomId) return;

    // Listen for last session summary
    const handleLastSession = (data: LastSessionSummary) => {
      setLastSession(data);
    };

    // Listen for pending items reminder
    const handlePendingItems = (data: PendingItemsReminder) => {
      setPendingItems(data);
    };

    // Listen for late join summary
    const handleLateJoin = (data: LateJoinSummary) => {
      setLateJoinSummary(data);
    };

    socket.on('room:last-session-summary', handleLastSession);
    socket.on('room:pending-actions-reminder', handlePendingItems);
    socket.on('room:late-join-summary', handleLateJoin);

    return () => {
      socket.off('room:last-session-summary', handleLastSession);
      socket.off('room:pending-actions-reminder', handlePendingItems);
      socket.off('room:late-join-summary', handleLateJoin);
    };
  }, [socket, roomId]);

  return {
    lastSession,
    pendingItems,
    lateJoinSummary,
    clearLastSession: () => setLastSession(null),
    clearPendingItems: () => setPendingItems(null),
    clearLateJoinSummary: () => setLateJoinSummary(null),
  };
}
```

### `src/hooks/useSummary.ts`

```typescript
import { useCallback, useState } from 'react';
import { Socket } from 'socket.io-client';

interface Summary {
  summaryId: string;
  bullets: string[];
  actionItems: any[];
  decisions: any[];
}

export function useSummary(socket: Socket | null, roomId: string) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSummary = useCallback(() => {
    if (!socket) return;

    setLoading(true);
    setError(null);

    socket.emit('summary:generate', { roomId }, (response: any) => {
      setLoading(false);
      if (response.success) {
        setSummary(response.summary);
      } else {
        setError(response.error || 'Failed to generate summary');
      }
    });
  }, [socket, roomId]);

  const getLatestSummary = useCallback(() => {
    if (!socket) return;

    socket.emit('summary:get-latest', { roomId }, (response: any) => {
      if (response.success) {
        setSummary(response.summary);
      }
    });
  }, [socket, roomId]);

  const getQuickSummary = useCallback(
    (minutes: number = 10) => {
      if (!socket) return Promise.reject('No socket');

      return new Promise((resolve, reject) => {
        socket.emit('summary:quick', { roomId, minutes }, (response: any) => {
          if (response.success) {
            resolve(response);
          } else {
            reject(response.error);
          }
        });
      });
    },
    [socket, roomId]
  );

  return {
    summary,
    loading,
    error,
    generateSummary,
    getLatestSummary,
    getQuickSummary,
  };
}
```

### `src/hooks/useActions.ts`

```typescript
import { useCallback, useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';

interface ActionItem {
  actionId: string;
  text: string;
  owner: string;
  ownerName: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  dueDate?: Date;
  createdAt: Date;
}

export function useActions(socket: Socket | null, roomId: string) {
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [myPendingActions, setMyPendingActions] = useState<ActionItem[]>([]);

  useEffect(() => {
    if (!socket) return;

    // Listen for new actions
    const handleActionCreated = (data: { action: ActionItem }) => {
      setActions((prev) => [...prev, data.action]);
    };

    // Listen for status updates
    const handleStatusUpdated = (data: { actionId: string; status: string }) => {
      setActions((prev) =>
        prev.map((action) =>
          action.actionId === data.actionId ? { ...action, status: data.status as any } : action
        )
      );
    };

    socket.on('action:created', handleActionCreated);
    socket.on('action:status-updated', handleStatusUpdated);

    return () => {
      socket.off('action:created', handleActionCreated);
      socket.off('action:status-updated', handleStatusUpdated);
    };
  }, [socket]);

  const createAction = useCallback(
    (text: string, owner?: string, priority: string = 'medium') => {
      if (!socket) return;

      socket.emit(
        'action:create',
        {
          roomId,
          text,
          owner,
          priority,
        },
        (response: any) => {
          if (response.success) {
            setActions((prev) => [...prev, response.action]);
          }
        }
      );
    },
    [socket, roomId]
  );

  const updateActionStatus = useCallback(
    (summaryId: string, actionId: string, status: string) => {
      if (!socket) return;

      socket.emit('action:update-status', {
        summaryId,
        actionId,
        status,
      });
    },
    [socket]
  );

  const getMyPendingActions = useCallback(() => {
    if (!socket) return;

    socket.emit('action:get-my-pending', (response: any) => {
      if (response.success) {
        setMyPendingActions(response.actions);
      }
    });
  }, [socket]);

  return {
    actions,
    myPendingActions,
    createAction,
    updateActionStatus,
    getMyPendingActions,
  };
}
```

### `src/hooks/useTimeline.ts`

```typescript
import { useCallback, useState } from 'react';
import { Socket } from 'socket.io-client';

interface Timeline {
  roomId: string;
  roomName: string;
  totalSessions: number;
  totalDuration: number;
  timeline: any[];
}

interface RoomStats {
  totalSessions: number;
  totalDuration: number;
  totalActions: number;
  completedActions: number;
  actionCompletionRate: number;
  totalDecisions: number;
  avgSessionDuration: number;
}

export function useTimeline(socket: Socket | null, roomId: string) {
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [stats, setStats] = useState<RoomStats | null>(null);
  const [loading, setLoading] = useState(false);

  const getTimeline = useCallback(
    (limit: number = 10) => {
      if (!socket) return;

      setLoading(true);
      socket.emit('timeline:get', { roomId, limit }, (response: any) => {
        setLoading(false);
        if (response.success) {
          setTimeline(response.timeline);
        }
      });
    },
    [socket, roomId]
  );

  const getStats = useCallback(() => {
    if (!socket) return;

    socket.emit('timeline:get-stats', { roomId }, (response: any) => {
      if (response.success) {
        setStats(response.stats);
      }
    });
  }, [socket, roomId]);

  return {
    timeline,
    stats,
    loading,
    getTimeline,
    getStats,
  };
}
```

---

## 🎨 REACT COMPONENTS

### `src/components/LastSessionBanner.tsx`

```typescript
import { formatDistanceToNow } from 'date-fns';
import { X, Clock, Users, CheckSquare } from 'lucide-react';

interface Props {
  lastSession: {
    endedAt: Date;
    duration: number;
    bullets: string[];
    actionItemsCount: number;
    decisionsCount: number;
  };
  onClose: () => void;
  onViewDetails: () => void;
}

export function LastSessionBanner({ lastSession, onClose, onViewDetails }: Props) {
  return (
    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4 rounded-r-lg">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-blue-900">
              Last Session
            </h3>
            <span className="text-sm text-blue-600">
              {formatDistanceToNow(new Date(lastSession.endedAt), { addSuffix: true })}
            </span>
          </div>

          <div className="space-y-1 mb-3">
            {lastSession.bullets.slice(0, 2).map((bullet, i) => (
              <p key={i} className="text-sm text-blue-800">
                • {bullet}
              </p>
            ))}
          </div>

          <div className="flex items-center gap-4 text-sm text-blue-700">
            <span className="flex items-center gap-1">
              <CheckSquare className="w-4 h-4" />
              {lastSession.actionItemsCount} actions
            </span>
            <span>{lastSession.decisionsCount} decisions</span>
            <span>{lastSession.duration} min</span>
          </div>

          <button
            onClick={onViewDetails}
            className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            View full summary →
          </button>
        </div>

        <button
          onClick={onClose}
          className="text-blue-400 hover:text-blue-600"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
```

### `src/components/PendingActionsReminder.tsx`

```typescript
import { AlertCircle, CheckSquare, Vote } from 'lucide-react';

interface Props {
  pendingItems: {
    count: number;
    actionsCount: number;
    decisionsCount: number;
    actions: any[];
    decisions: any[];
  };
  onViewActions: () => void;
  onClose: () => void;
}

export function PendingActionsReminder({ pendingItems, onViewActions, onClose }: Props) {
  return (
    <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-4 rounded-r-lg">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <h3 className="font-semibold text-amber-900">
              You have {pendingItems.count} pending item{pendingItems.count !== 1 ? 's' : ''}
            </h3>
          </div>

          {pendingItems.actionsCount > 0 && (
            <div className="mb-2">
              <p className="text-sm font-medium text-amber-800 mb-1">
                <CheckSquare className="w-4 h-4 inline mr-1" />
                {pendingItems.actionsCount} action{pendingItems.actionsCount !== 1 ? 's' : ''}:
              </p>
              {pendingItems.actions.slice(0, 2).map((action, i) => (
                <p key={i} className="text-sm text-amber-700 ml-5">
                  • {action.text}
                </p>
              ))}
            </div>
          )}

          {pendingItems.decisionsCount > 0 && (
            <div className="mb-2">
              <p className="text-sm font-medium text-amber-800 mb-1">
                <Vote className="w-4 h-4 inline mr-1" />
                {pendingItems.decisionsCount} decision{pendingItems.decisionsCount !== 1 ? 's' : ''} awaiting your vote
              </p>
            </div>
          )}

          <button
            onClick={onViewActions}
            className="mt-2 text-sm font-medium text-amber-600 hover:text-amber-700"
          >
            View all pending items →
          </button>
        </div>

        <button
          onClick={onClose}
          className="text-amber-400 hover:text-amber-600"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
```

### `src/components/LateJoinBanner.tsx`

```typescript
import { Info, Clock } from 'lucide-react';

interface Props {
  lateJoinSummary: {
    sessionDuration: number;
    summaryDuration: number;
    bullets: string[];
  };
  onClose: () => void;
}

export function LateJoinBanner({ lateJoinSummary, onClose }: Props) {
  return (
    <div className="bg-purple-50 border-l-4 border-purple-500 p-4 mb-4 rounded-r-lg">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Info className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-purple-900">
              You joined late
            </h3>
            <span className="text-sm text-purple-600">
              Session has been running for {lateJoinSummary.sessionDuration} minutes
            </span>
          </div>

          <p className="text-sm font-medium text-purple-800 mb-2">
            Here's what you missed (last {lateJoinSummary.summaryDuration} min):
          </p>

          <div className="space-y-1">
            {lateJoinSummary.bullets.map((bullet, i) => (
              <p key={i} className="text-sm text-purple-700">
                • {bullet}
              </p>
            ))}
          </div>
        </div>

        <button
          onClick={onClose}
          className="text-purple-400 hover:text-purple-600"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
```

---

## 🎯 USAGE EXAMPLE

### `src/pages/Room.tsx`

```typescript
import { useEffect, useState } from 'react';
import socketService from '../services/socket';
import { useRoomMemory } from '../hooks/useRoomMemory';
import { useSummary } from '../hooks/useSummary';
import { useActions } from '../hooks/useActions';
import { LastSessionBanner } from '../components/LastSessionBanner';
import { PendingActionsReminder } from '../components/PendingActionsReminder';
import { LateJoinBanner } from '../components/LateJoinBanner';

export function Room({ roomId }: { roomId: string }) {
  const socket = socketService.getSocket();

  // Use hooks
  const {
    lastSession,
    pendingItems,
    lateJoinSummary,
    clearLastSession,
    clearPendingItems,
    clearLateJoinSummary
  } = useRoomMemory(socket, roomId);

  const { summary, generateSummary } = useSummary(socket, roomId);
  const { actions, createAction, updateActionStatus } = useActions(socket, roomId);

  return (
    <div className="p-4">
      {/* Room Memory Banners */}
      {lastSession && (
        <LastSessionBanner
          lastSession={lastSession}
          onClose={clearLastSession}
          onViewDetails={() => {/* Show modal */}}
        />
      )}

      {pendingItems && (
        <PendingActionsReminder
          pendingItems={pendingItems}
          onViewActions={() => {/* Show panel */}}
          onClose={clearPendingItems}
        />
      )}

      {lateJoinSummary && (
        <LateJoinBanner
          lateJoinSummary={lateJoinSummary}
          onClose={clearLateJoinSummary}
        />
      )}

      {/* Room Content */}
      <div className="space-y-4">
        <button
          onClick={generateSummary}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          Generate Summary
        </button>

        {summary && (
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-bold mb-2">Summary</h3>
            <ul className="space-y-1">
              {summary.bullets.map((bullet, i) => (
                <li key={i}>• {bullet}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions, Decisions, etc. */}
      </div>
    </div>
  );
}
```

---

## 🚀 INTEGRATION STEPS

1. **Install packages**:

   ```bash
   npm install socket.io-client axios date-fns lucide-react
   ```

2. **Copy hooks** to `src/hooks/`

3. **Copy components** to `src/components/`

4. **Initialize socket** in your app:

   ```typescript
   import socketService from './services/socket';

   useEffect(() => {
     socketService.connect(userToken);
     return () => socketService.disconnect();
   }, [userToken]);
   ```

5. **Use in room component**:
   ```typescript
   const socket = socketService.getSocket();
   const { lastSession, pendingItems } = useRoomMemory(socket, roomId);
   ```

---

**Client integration complete!** 🎉

All hooks and components are ready to use. The server will automatically send room memory when users join.
