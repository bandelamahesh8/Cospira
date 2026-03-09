import { useState, useEffect, useCallback } from 'react';
import { roomEventBus, BreakoutEventMap } from '@/lib/breakout/EventBus';

export type FeedEventType =
  | 'JOIN'
  | 'LEAVE'
  | 'STATE_CHANGE'
  | 'ALERT'
  | 'AUTOMATION'
  | 'NEURAL_GUARDIAN';

export interface FeedEvent {
  id: string;
  type: FeedEventType;
  title: string;
  description: string;
  timestamp: number;
  level?: 'info' | 'warning' | 'error' | 'success';
  breakoutId?: string;
  userId?: string;
}

/**
 * useCommandFeed
 * ─────────────────────────────────────────────────────────────
 * Subscribes to the roomEventBus and maintains a transient
 * rolling window of the last N events for the UI to display.
 */
export function useCommandFeed(maxEvents = 50) {
  const [events, setEvents] = useState<FeedEvent[]>([]);

  const addEvent = useCallback(
    (event: Omit<FeedEvent, 'id'>) => {
      setEvents((prev) => {
        const newEvent = { ...event, id: crypto.randomUUID() };
        const nextState = [newEvent, ...prev];
        if (nextState.length > maxEvents) {
          return nextState.slice(0, maxEvents);
        }
        return nextState;
      });
    },
    [maxEvents]
  );

  const clearFeed = useCallback(() => setEvents([]), []);

  useEffect(() => {
    const handleJoin = (payload: BreakoutEventMap['USER_JOIN']) => {
      addEvent({
        type: 'JOIN',
        title: 'User Joined',
        description: `User joined room ${payload.breakoutId.slice(0, 6)}`,
        timestamp: Date.now(),
        breakoutId: payload.breakoutId,
        userId: payload.userId,
      });
    };

    const handleLeave = (payload: BreakoutEventMap['USER_LEAVE']) => {
      addEvent({
        type: 'LEAVE',
        title: 'User Left',
        description: `User left room ${payload.breakoutId.slice(0, 6)}`,
        timestamp: Date.now(),
        breakoutId: payload.breakoutId,
        userId: payload.userId,
      });
    };

    const handleStateChange = (payload: BreakoutEventMap['ROOM_STATE_CHANGE']) => {
      let desc = `Status updated to ${payload.status || 'unknown'}`;
      if (payload.hostDisconnected) desc = 'Host Disconnected!';
      addEvent({
        type: 'STATE_CHANGE',
        title: `Room ${payload.breakoutId.slice(0, 6)} State Change`,
        description: desc,
        timestamp: Date.now(),
        breakoutId: payload.breakoutId,
        level: payload.hostDisconnected ? 'error' : 'info',
      });
    };

    const handleAlert = (payload: BreakoutEventMap['SYSTEM_ALERT']) => {
      addEvent({
        type: 'ALERT',
        title: payload.title,
        description: payload.description,
        timestamp: payload.timestamp,
        level: payload.level,
        breakoutId: payload.breakoutId,
      });
    };

    const handleAutomation = (payload: BreakoutEventMap['AUTOMATION_EXECUTED']) => {
      addEvent({
        type: 'AUTOMATION',
        title: `AI Action: ${payload.action}`,
        description: payload.description,
        timestamp: payload.timestamp,
        level: 'success',
        breakoutId: payload.targetId,
      });
    };

    const handleSpike = (payload: BreakoutEventMap['EMOTIONAL_SPIKE']) => {
      addEvent({
        type: 'NEURAL_GUARDIAN',
        title: 'Emotional Spike Detected',
        description: `Intensity: ${payload.intensity} | Sentiment: ${payload.primarySentiment}. Intervention might occur.`,
        timestamp: payload.timestamp,
        level: payload.intensity === 'HIGH' ? 'error' : 'warning',
        breakoutId: payload.breakoutId,
      });
    };

    roomEventBus.on('USER_JOIN', handleJoin);
    roomEventBus.on('USER_LEAVE', handleLeave);
    roomEventBus.on('ROOM_STATE_CHANGE', handleStateChange);
    roomEventBus.on('SYSTEM_ALERT', handleAlert);
    roomEventBus.on('AUTOMATION_EXECUTED', handleAutomation);
    roomEventBus.on('EMOTIONAL_SPIKE', handleSpike);

    return () => {
      roomEventBus.off('USER_JOIN', handleJoin);
      roomEventBus.off('USER_LEAVE', handleLeave);
      roomEventBus.off('ROOM_STATE_CHANGE', handleStateChange);
      roomEventBus.off('SYSTEM_ALERT', handleAlert);
      roomEventBus.off('AUTOMATION_EXECUTED', handleAutomation);
      roomEventBus.off('EMOTIONAL_SPIKE', handleSpike);
    };
  }, [addEvent]);

  return { events, clearFeed };
}
