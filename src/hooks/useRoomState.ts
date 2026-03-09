/**
 * useRoomState — React hook for the Room State Machine
 *
 * Provides:
 *  - roomState: current room state (LIVE, PRESENTATION, etc.)
 *  - statePreset: permission preset for current state
 *  - stateHistory: recent state transitions
 *  - allStates: all valid states with transitions
 *  - transitionState: trigger a state transition (host only)
 */

import { useState, useEffect, useCallback } from 'react';

export type RoomState =
  | 'CREATED'
  | 'WAITING'
  | 'LIVE'
  | 'PRESENTATION'
  | 'DISCUSSION'
  | 'LOCKED'
  | 'ENDED';

export interface StatePreset {
  mic: string;
  video: string;
  screen_share: string;
  chat: string;
  join: string;
  description: string;
}

export interface StateHistoryEntry {
  from: string;
  to: string;
  at: string;
  triggeredBy: string;
}

export interface StateDefinition {
  state: RoomState;
  preset: StatePreset;
  transitions: RoomState[];
}

interface UseRoomStateReturn {
  roomState: RoomState;
  statePreset: StatePreset | null;
  stateHistory: StateHistoryEntry[];
  allStates: StateDefinition[];
  isTransitioning: boolean;
  lastTransition: { state: RoomState; previousState: RoomState; triggeredBy: string } | null;
  transitionState: (newState: RoomState) => void;
  refresh: () => void;
}

const STATE_COLORS: Record<RoomState, string> = {
  CREATED: 'text-slate-400',
  WAITING: 'text-amber-400',
  LIVE: 'text-emerald-400',
  PRESENTATION: 'text-blue-400',
  DISCUSSION: 'text-purple-400',
  LOCKED: 'text-red-400',
  ENDED: 'text-slate-500',
};

export const getRoomStateColor = (state: RoomState): string =>
  STATE_COLORS[state] ?? 'text-slate-400';

export function useRoomState(
  roomId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  socket: any,
  isHost = false
): UseRoomStateReturn {
  const [roomState, setRoomState] = useState<RoomState>('LIVE');
  const [statePreset, setStatePreset] = useState<StatePreset | null>(null);
  const [stateHistory, setStateHistory] = useState<StateHistoryEntry[]>([]);
  const [allStates, setAllStates] = useState<StateDefinition[]>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [lastTransition, setLastTransition] = useState<{
    state: RoomState;
    previousState: RoomState;
    triggeredBy: string;
  } | null>(null);

  const refresh = useCallback(() => {
    if (!socket || !roomId) return;
    socket.emit('room:get_state', { roomId });
  }, [socket, roomId]);

  useEffect(() => {
    if (!socket) return;
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!socket) return;

    const onRoomState = ({
      roomId: rid,
      currentState,
      preset,
      transitions,
      stateHistory: history,
    }: {
      roomId: string;
      currentState: RoomState;
      preset: StatePreset;
      transitions: StateDefinition[];
      stateHistory: StateHistoryEntry[];
    }) => {
      if (rid !== roomId) return;
      setRoomState(currentState);
      setStatePreset(preset);
      setAllStates(transitions ?? []);
      setStateHistory(history ?? []);
    };

    const onStateChanged = ({
      state,
      previousState,
      preset,
      triggeredBy,
    }: {
      state: RoomState;
      previousState: RoomState;
      preset: StatePreset;
      triggeredBy: string;
    }) => {
      setRoomState(state);
      setStatePreset(preset);
      setIsTransitioning(false);
      setLastTransition({ state, previousState, triggeredBy });
      setStateHistory((prev) =>
        [
          ...prev,
          { from: previousState, to: state, at: new Date().toISOString(), triggeredBy },
        ].slice(-20)
      );

      // Clear last transition after 5s
      setTimeout(() => setLastTransition(null), 5000);
    };

    socket.on('room:state', onRoomState);
    socket.on('room:state_changed', onStateChanged);

    return () => {
      socket.off('room:state', onRoomState);
      socket.off('room:state_changed', onStateChanged);
    };
  }, [socket, roomId]);

  const transitionState = useCallback(
    (newState: RoomState) => {
      if (!socket || !isHost) return;
      setIsTransitioning(true);
      socket.emit('room:state_change', { roomId, newState });
    },
    [socket, roomId, isHost]
  );

  return {
    roomState,
    statePreset,
    stateHistory,
    allStates,
    isTransitioning,
    lastTransition,
    transitionState,
    refresh,
  };
}
