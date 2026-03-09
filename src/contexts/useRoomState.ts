import { useState, useCallback, useEffect, useRef } from 'react';
import { BreakoutSession, UserPresence } from '@/types/organization';
import { OrgMember, BreakoutService } from '@/services/BreakoutService';
import { roomEventBus, BreakoutEventMap } from '@/lib/breakout/EventBus';

export const useRoomState = (orgId: string | undefined) => {
  const [breakouts, setBreakouts] = useState<BreakoutSession[]>([]);
  const [lobbyUsers, setLobbyUsers] = useState<UserPresence[]>([]);
  const [currentBreakout, setCurrentBreakout] = useState<BreakoutSession | null>(null);
  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMembersLoading, setIsMembersLoading] = useState(false);

  const currentBreakoutRef = useRef<BreakoutSession | null>(null);
  useEffect(() => {
    currentBreakoutRef.current = currentBreakout;
  }, [currentBreakout]);

  // Initialize and refresh data
  const refreshBreakouts = useCallback(async () => {
    if (!orgId) return;
    setIsLoading(true);
    try {
      const data = await BreakoutService.getBreakouts(orgId);
      setBreakouts(data);
      roomEventBus.emit('ROOMS_REFRESHED', data);

      // Sync the current breakout if it exists
      if (currentBreakoutRef.current) {
        const updated = data.find((b) => b.id === currentBreakoutRef.current?.id);
        if (updated) {
          setCurrentBreakout(updated);
        }
      }
    } catch (err: unknown) {
      // Handle the specialized AbortError returned by Supabase when concurrent requests "steal" a lock
      const errorStr = String(err);
      const isLockError =
        errorStr.includes('AbortError') ||
        errorStr.includes('Lock broken') ||
        (err &&
          typeof err === 'object' &&
          'message' in err &&
          String((err as Record<string, unknown>).message).includes('Lock broken'));

      if (isLockError) {
        return;
      }
      console.error('[useRoomState] Failed to fetch breakouts:', err);
    } finally {
      setIsLoading(false);
    }
  }, [orgId]); // Removed currentBreakout dependency to avoid infinite loops

  const refreshOrgMembers = useCallback(async () => {
    if (!orgId) return;
    setIsMembersLoading(true);
    try {
      const members = await BreakoutService.getOrgMembers(orgId);
      setOrgMembers(members);
      roomEventBus.emit('MEMBERS_REFRESHED', members);
    } catch (err: unknown) {
      const errorStr = String(err);
      const isLockError =
        errorStr.includes('AbortError') ||
        errorStr.includes('Lock broken') ||
        (err &&
          typeof err === 'object' &&
          'message' in err &&
          String((err as Record<string, unknown>).message).includes('Lock broken'));

      if (isLockError) {
        return;
      }
      console.error('[useRoomState] Failed to fetch org members:', err);
    } finally {
      setIsMembersLoading(false);
    }
  }, [orgId]);

  // Event Bus Subscriptions
  useEffect(() => {
    const onRoomStateChange = (payload: BreakoutEventMap['ROOM_STATE_CHANGE']) => {
      setBreakouts((prev) => {
        if (payload.parentBreakoutId) {
          return prev.map((b) =>
            b.id === payload.parentBreakoutId
              ? {
                  ...b,
                  child_rooms: (b.child_rooms || []).map((child) =>
                    child.id === payload.breakoutId
                      ? {
                          ...child,
                          ...(payload.status ? { status: payload.status } : {}),
                          ...(payload.hostId !== undefined ? { host_id: payload.hostId } : {}),
                        }
                      : child
                  ),
                }
              : b
          );
        }

        return prev.map((b) =>
          b.id === payload.breakoutId
            ? {
                ...b,
                ...(payload.status ? { status: payload.status } : {}),
                ...(payload.hostId !== undefined ? { host_id: payload.hostId } : {}),
              }
            : b
        );
      });

      if (currentBreakout?.id === payload.breakoutId) {
        setCurrentBreakout((prev) =>
          prev
            ? {
                ...prev,
                ...(payload.status ? { status: payload.status } : {}),
                ...(payload.hostId !== undefined ? { host_id: payload.hostId } : {}),
              }
            : null
        );
      }
    };

    const onRoomPause = (payload: BreakoutEventMap['ROOM_PAUSE']) => {
      // Usually handled by state change, but can manually override
      onRoomStateChange({ breakoutId: payload.breakoutId, status: payload.status });
    };

    const onRoomResume = (payload: BreakoutEventMap['ROOM_RESUME']) => {
      onRoomStateChange({ breakoutId: payload.breakoutId, status: payload.status });
    };

    roomEventBus.on('ROOM_STATE_CHANGE', onRoomStateChange);
    roomEventBus.on('ROOM_PAUSE', onRoomPause);
    roomEventBus.on('ROOM_RESUME', onRoomResume);

    return () => {
      roomEventBus.off('ROOM_STATE_CHANGE', onRoomStateChange);
      roomEventBus.off('ROOM_PAUSE', onRoomPause);
      roomEventBus.off('ROOM_RESUME', onRoomResume);
    };
  }, [currentBreakout?.id]);

  return {
    breakouts,
    setBreakouts,
    lobbyUsers,
    setLobbyUsers,
    currentBreakout,
    setCurrentBreakout,
    orgMembers,
    setOrgMembers,
    isLoading,
    isMembersLoading,
    refreshBreakouts,
    refreshOrgMembers,
  };
};
