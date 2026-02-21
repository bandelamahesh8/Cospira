# MEDIA QUALITY & PRESENCE INTEGRATION GUIDE (PHASE 4)

This guide helps you integrate real-time quality monitoring and presence detection into the React client.

---

## 1. Presence Detection Hook

Use this hook to track user activity and broadcast status changes (Active/Idle/Away).

```typescript
import { useEffect, useState } from 'react';
import { useSocket } from './useSocket';

export const usePresence = (roomId: string) => {
  const { socket } = useSocket();
  const [status, setStatus] = useState<'active' | 'idle' | 'away'>('active');

  useEffect(() => {
    let idleTimer: NodeJS.Timeout;
    let awayTimer: NodeJS.Timeout;

    const updateStatus = (newStatus: 'active' | 'idle' | 'away') => {
      setStatus(newStatus);
      socket?.emit('user:update-status', { roomId, status: newStatus });
    };

    const handleActivity = () => {
      if (status !== 'active') updateStatus('active');

      clearTimeout(idleTimer);
      clearTimeout(awayTimer);

      idleTimer = setTimeout(() => updateStatus('idle'), 5 * 60 * 1000); // 5 min
      awayTimer = setTimeout(() => updateStatus('away'), 15 * 60 * 1000); // 15 min
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
    };
  }, [socket, roomId, status]);

  return { status };
};
```

---

## 2. WebRTC Quality Monitoring

Periodically report WebRTC stats to the server for connection health tracking.

```typescript
import { useEffect } from 'react';

export const useQualityReporting = (roomId: string, pc: RTCPeerConnection | null) => {
  useEffect(() => {
    if (!pc) return;

    const interval = setInterval(async () => {
      const stats = await pc.getStats();
      let metrics = {
        packetLoss: 0,
        latency: 0,
        jitter: 0,
      };

      stats.forEach((report) => {
        if (report.type === 'inbound-rtp' && report.kind === 'video') {
          metrics.packetLoss = (report.packetsLost / report.packetsReceived) * 100;
          metrics.jitter = report.jitter;
        }
        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          metrics.latency = report.currentRoundTripTime * 1000;
        }
      });

      socket.emit('media:quality-report', { roomId, metrics });
    }, 10000); // Report every 10 seconds

    return () => clearInterval(interval);
  }, [pc, roomId]);
};
```

---

## 3. UI Implementation: Connection Warnings

Listen for `user:connection-warning` to show a "Poor Connection" badge.

```typescript
socket.on('user:connection-warning', ({ userId, userName, severity }) => {
  toast.warn(`${userName} has a ${severity} connection.`, {
    description: 'They may experience audio/video lag.',
  });
});
```
