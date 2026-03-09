import React, { createContext, useEffect, useState, useCallback, useRef } from 'react';
import { useOrganization } from '@/contexts/useOrganization';
import { useAuth } from '@/hooks/useAuth';
import {
  BreakoutSession,
  UserPresence,
  OrgMode,
  UserLocation,
  AIInsight,
  RoomType,
  SecurityLevel,
} from '@/types/organization';
import { BreakoutService, OrgMember } from '@/services/BreakoutService';
import { ModePolicyResolver, PolicyProfile } from '@/lib/ModePolicyResolver';
import { SOCKET_EVENTS } from '@/lib/SocketRoomStrategy';
import { roomEventBus } from '@/lib/breakout/EventBus';
import { eventLogger } from '@/lib/breakout/EventLogger';
import { automationEngine } from '@/lib/breakout/AutomationEngine';
import { aiEngine } from '@/lib/breakout/AIEngine';
import { useRoomState } from '@/contexts/useRoomState';
import { toast } from 'sonner';

// AI Insight (advisory output — never mutates breakout state)

// ─────────────────────────────────────────────────────────────
// Context Type
// ─────────────────────────────────────────────────────────────

interface BreakoutContextType {
  // State
  breakouts: BreakoutSession[];
  lobbyUsers: UserPresence[];
  userLocations: Map<string, UserLocation>;
  currentBreakout: BreakoutSession | null;
  effectiveMode: Exclude<OrgMode, 'MIXED'> | null;
  policy: PolicyProfile | null;
  isLoading: boolean;

  // Connectivity
  isReconnecting: boolean;

  // Org Owner actions
  createBreakout: (
    name: string,
    maxParticipants?: number,
    modeOverride?: OrgMode,
    roomType?: RoomType,
    securityLevel?: SecurityLevel
  ) => Promise<void>;
  assignHost: (breakoutId: string, userId: string) => Promise<void>;
  assignParticipant: (breakoutId: string, userId: string) => Promise<void>;
  startBreakout: (breakoutId: string) => Promise<void>;
  closeBreakout: (breakoutId: string) => Promise<void>;
  removeParticipantToLobby: (breakoutId: string, userId: string) => Promise<void>;

  // Advanced Child Rooms & Master Controls
  createChildRoom: (
    parentId: string,
    name: string,
    maxParticipants?: number,
    roomType?: RoomType,
    securityLevel?: SecurityLevel
  ) => Promise<void>;
  masterBroadcast: (message: string, targetBreakoutId?: string) => void;
  forceTransferUser: (userId: string, targetRoomId: string) => Promise<void>;

  /**
   * Switch org mode — blocked if any LIVE breakout is active.
   * Returns true if switch succeeded, false if blocked.
   */
  switchOrgMode: (mode: OrgMode) => Promise<boolean>;

  /**
   * Pause a LIVE breakout (called when host disconnects in ULTRA_SECURE).
   */
  pauseBreakout: (breakoutId: string) => Promise<void>;

  /**
   * Resume a PAUSED breakout.
   */
  resumeBreakout: (breakoutId: string) => Promise<void>;

  // Navigation
  setCurrentBreakout: (breakout: BreakoutSession | null) => void;
  refreshBreakouts: () => Promise<void>;

  // AI Insights (advisory, read-only — never mutates breakout state)
  aiInsights: AIInsight[];
  aiEnabled: boolean;
  killAI: () => void;
  enableAI: () => void;

  // Org Member Roster (for Dispatch Center)
  orgMembers: OrgMember[];
  isMembersLoading: boolean;
  refreshOrgMembers: () => Promise<void>;
  batchAssignParticipants: (breakoutId: string, userIds: string[]) => Promise<void>;
}

// ─────────────────────────────────────────────────────────────
// Context + Provider
// ─────────────────────────────────────────────────────────────

const BreakoutContext = createContext<BreakoutContextType | undefined>(undefined);

export const BreakoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();

  const {
    breakouts,
    lobbyUsers,
    setLobbyUsers,
    currentBreakout,
    setCurrentBreakout,
    orgMembers,
    isLoading,
    isMembersLoading,
    refreshBreakouts,
    refreshOrgMembers,
  } = useRoomState(currentOrganization?.id || undefined);

  const [userLocations] = useState<Map<string, UserLocation>>(new Map());
  const [isReconnecting, setIsReconnecting] = useState(false);

  // AI insight state — separate from realtime state, never mutates breakouts[]
  const [aiInsights, setAIInsights] = useState<AIInsight[]>([]);
  const [aiEnabled, setAIEnabled] = useState(false);

  // Track visibility for reconnect on page restore (Phase 10: page refresh edge case)
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Derived: effective mode based on current org + current breakout
  const effectiveMode = currentOrganization
    ? ModePolicyResolver.resolveEffectiveMode(currentOrganization, currentBreakout)
    : null;

  const policy = effectiveMode ? ModePolicyResolver.getPolicy(effectiveMode) : null;

  useEffect(() => {
    // Initialize observability and rule engines
    eventLogger.init();
    automationEngine.init();
    aiEngine.init();

    if (currentOrganization) {
      refreshBreakouts();
      refreshOrgMembers();
    }
    // The hook handles clearing state when orgId becomes undefined

    return () => {
      // Cleanup happens if the provider unmounts completely
      eventLogger.destroy();
      automationEngine.destroy();
      aiEngine.destroy();
    };
  }, [currentOrganization, refreshBreakouts, refreshOrgMembers]);

  // ─── Phase 10: Page Visibility Reconnect ──────────────────
  // When the user returns to the tab (after refresh/backgrounding), re-fetch
  // breakout state so their view is consistent with server truth.

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && currentOrganization) {
        setIsReconnecting(true);
        // Debounce to avoid hammering on rapid tab switches
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = setTimeout(async () => {
          try {
            await refreshBreakouts();
          } finally {
            setIsReconnecting(false);
          }
        }, 800);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [currentOrganization, refreshBreakouts]);

  // ─── Phase 10: Online/Offline Reconnect ───────────────────
  // When the browser comes back online, treat as a reconnect and refresh.

  useEffect(() => {
    const handleOnline = async () => {
      if (!currentOrganization) return;
      setIsReconnecting(true);
      toast.info('Reconnected — syncing breakout state...');
      try {
        await refreshBreakouts();
      } finally {
        setIsReconnecting(false);
      }
      toast.success('Breakout state synced');
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [currentOrganization, refreshBreakouts]);

  // ─── GAP 2+4: Socket Event Listeners ─────────────────────
  // Client state is READ-ONLY reflection of server events.
  // No optimistic updates — server is the authority.

  useEffect(() => {
    // Access the signaling socket via the global exposed by SignalingService
    // (SignalingService sets window.__cospiraSignaling for cross-context access)
    interface SignalingWindow extends Window {
      __cospiraSignaling?: {
        /* eslint-disable @typescript-eslint/no-explicit-any */
        on: (event: string, cb: (payload: any) => void) => void;
        off: (event: string, cb: (payload: any) => void) => void;
        emit: (event: string, payload: any) => void;
        /* eslint-enable @typescript-eslint/no-explicit-any */
      };
    }
    const signaling = (window as unknown as SignalingWindow).__cospiraSignaling;
    if (!signaling) return;

    /**
     * POLICY_DENIED: Server rejected an action due to policy.
     * GAP 1 — Show audit_event_id (correlation ID) so users can reference
     * the exact audit row in support escalations and legal traceability.
     */
    const onPolicyDenied = (payload: {
      action: string;
      reason: string;
      auditCode: string;
      wasAudited: boolean;
      audit_event_id?: string | null;
    }) => {
      const correlationStr = payload.audit_event_id
        ? `Ref: ${payload.audit_event_id.slice(0, 8)}…` // short prefix — full ID in audit panel
        : payload.auditCode;

      toast.error(`Action blocked: ${payload.reason}`, {
        description: payload.wasAudited
          ? `🔒 Audit code: ${payload.auditCode} — ${correlationStr}`
          : `Policy code: ${payload.auditCode}`,
        duration: 6000,
      });
    };

    /**
     * breakout:state-updated: Emits a structural event to EventBus payload.
     */
    const onBreakoutStateUpdated = (payload: {
      breakoutId: string;
      parentBreakoutId?: string;
      status?: BreakoutSession['status'];
      hostId?: string;
      name?: string;
      mode?: string;
      hostDisconnected?: boolean;
      bannerMessage?: string;
    }) => {
      if (payload.bannerMessage) {
        toast.warning(payload.bannerMessage);
      }

      // Propagate the structural event to our centralized EventBus
      roomEventBus.emit('ROOM_STATE_CHANGE', {
        breakoutId: payload.breakoutId,
        parentBreakoutId: payload.parentBreakoutId,
        status: payload.status,
        hostId: payload.hostId,
        name: payload.name,
        mode: payload.mode,
        hostDisconnected: payload.hostDisconnected,
      });
    };

    /**
     * user:joined & user:left: Emits to EventBus for state updates.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onUserJoined = (payload: {
      breakoutId: string;
      user?: any;
      userId: string;
      membersCount: number;
      isChildRoom?: boolean;
      parentId?: string;
    }) => {
      if (payload.breakoutId === 'lobby') {
        setLobbyUsers((prev) => {
          if (prev.some((u) => u.user_id === payload.user?.id)) return prev;
          return [
            ...prev,
            {
              user_id: payload.user?.id,
              display_name:
                payload.user?.raw_user_meta_data?.display_name ||
                payload.user?.display_name ||
                'Guest',
              avatar_url: payload.user?.raw_user_meta_data?.avatar_url || payload.user?.avatar_url,
              organization_id: currentOrganization!.id,
              location: 'LOBBY',
            },
          ];
        });
        return;
      }

      roomEventBus.emit('USER_JOIN', {
        breakoutId: payload.breakoutId,
        userId: payload.userId,
        user: payload.user,
        membersCount: payload.membersCount,
      });
    };

    const onUserLeft = (payload: {
      breakoutId: string;
      userId: string;
      membersCount: number;
      isChildRoom?: boolean;
      parentId?: string;
    }) => {
      if (payload.breakoutId === 'lobby') {
        setLobbyUsers((prev) => prev.filter((u) => u.user_id !== payload.userId));
        return;
      }

      roomEventBus.emit('USER_LEAVE', {
        breakoutId: payload.breakoutId,
        userId: payload.userId,
        membersCount: payload.membersCount,
      });
    };
    /**
     * breakout:paused: Server broadcast that a breakout was paused.
     * Also carries the full snapshot for direct state application.
     */
    const onBreakoutPaused = (payload: {
      breakoutId: string;
      reason: string;
      bannerMessage?: string;
      status?: string;
    }) => {
      if (payload.bannerMessage) {
        toast.warning(payload.bannerMessage);
      } else if (payload.reason === 'HOST_DISCONNECTED') {
        toast.warning('Breakout paused — host disconnected');
      }
      // Apply snapshot (server sends status: 'PAUSED' in the payload)
      if (payload.status) {
        // Trigger a full refresh to get the absolute source of truth.
        refreshBreakouts();
      }
    };

    /**
     * breakout:resumed: Server confirmed a paused breakout is LIVE again.
     * Carries the full snapshot for direct state application.
     */
    const onBreakoutResumed = (payload: {
      breakoutId: string;
      status?: string;
      hostId?: string;
    }) => {
      toast.success('Breakout resumed — session is LIVE');
      if (payload.breakoutId) {
        // Trigger a refresh since state is now centralized in useRoomState
        refreshBreakouts();
      }
    };

    /**
     * org:mode-changed: Server confirmed an org mode switch.
     */
    const onOrgModeChanged = async (payload: { orgId: string; newMode: OrgMode }) => {
      toast.info(`Organization mode changed to ${payload.newMode}`);
      await refreshBreakouts();
    };

    /**
     * breakout:host-disconnected: Private owner notification.
     */
    const onHostDisconnected = (payload: { breakoutId: string; breakoutName: string }) => {
      toast.warning(`Host disconnected from "${payload.breakoutName}"`, {
        description: 'Session paused. Go to Organization Room to resume.',
        duration: 10_000,
      });
    };

    signaling.on(SOCKET_EVENTS.POLICY_DENIED, onPolicyDenied);
    signaling.on(SOCKET_EVENTS.BREAKOUT_STATE_UPDATED, onBreakoutStateUpdated);
    signaling.on(SOCKET_EVENTS.BREAKOUT_PAUSED, onBreakoutPaused);
    signaling.on(SOCKET_EVENTS.BREAKOUT_RESUMED, onBreakoutResumed);
    signaling.on(SOCKET_EVENTS.ORG_MODE_CHANGED, onOrgModeChanged);
    signaling.on(SOCKET_EVENTS.HOST_DISCONNECTED_ALERT, onHostDisconnected);
    signaling.on('breakout:user-joined', onUserJoined);
    signaling.on('breakout:user-left', onUserLeft);

    // ── AI Observer Socket Events ──────────────────────────
    // AI insights are ADDITIVE — they never mutate breakout state
    const onAIInsightNew = (insight: AIInsight) => {
      setAIInsights((prev) => [insight, ...prev].slice(0, 100)); // Cap at 100
    };

    const onAIStatus = (status: { enabled: boolean; orgId: string }) => {
      setAIEnabled(status.enabled);
    };

    const onLobbyUpdated = (users: UserPresence[]) => {
      setLobbyUsers(users);
    };

    signaling.on('presence:lobby-updated', onLobbyUpdated);
    signaling.on('ai:insight:new', onAIInsightNew);
    signaling.on('ai:status', onAIStatus);

    const onMasterBroadcast = (payload: { message: string; senderId: string; orgId: string }) => {
      // Dynamic Island / Premium alert for master broadcast
      toast(payload.message, {
        icon: '📢',
        style: {
          background: 'rgba(20, 20, 20, 0.85)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: 'white',
          fontWeight: 500,
          borderRadius: '16px',
        },
        duration: 10000, // Stay longer
      });
    };

    signaling.on('org:master-broadcast', onMasterBroadcast);

    return () => {
      signaling.off(SOCKET_EVENTS.POLICY_DENIED, onPolicyDenied);
      signaling.off(SOCKET_EVENTS.BREAKOUT_STATE_UPDATED, onBreakoutStateUpdated);
      signaling.off(SOCKET_EVENTS.BREAKOUT_PAUSED, onBreakoutPaused);
      signaling.off(SOCKET_EVENTS.BREAKOUT_RESUMED, onBreakoutResumed);
      signaling.off(SOCKET_EVENTS.ORG_MODE_CHANGED, onOrgModeChanged);
      signaling.off(SOCKET_EVENTS.HOST_DISCONNECTED_ALERT, onHostDisconnected);
      signaling.off('breakout:user-joined', onUserJoined);
      signaling.off('breakout:user-left', onUserLeft);
      signaling.off('presence:lobby-updated', onLobbyUpdated);
      signaling.off('ai:insight:new', onAIInsightNew);
      signaling.off('ai:status', onAIStatus);
      signaling.off('org:master-broadcast', onMasterBroadcast);
    };
  }, [refreshBreakouts, currentOrganization, setLobbyUsers]);

  // ─── Actions ───────────────────────────────────────────────

  const createBreakout = useCallback(
    async (
      name: string,
      maxParticipants: number = 20,
      modeOverride?: OrgMode,
      roomType: RoomType = 'GENERAL',
      securityLevel: SecurityLevel = 'STANDARD'
    ) => {
      if (!currentOrganization) return;
      try {
        await BreakoutService.createBreakout(
          currentOrganization.id,
          name,
          maxParticipants,
          modeOverride,
          user?.id,
          undefined, // no parent
          roomType,
          securityLevel
        );
        toast.success(`Breakout "${name}" created`);
        await refreshBreakouts();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to create breakout';
        toast.error(msg);
        throw err;
      }
    },
    [currentOrganization, refreshBreakouts, user?.id]
  );

  const assignHost = useCallback(
    async (breakoutId: string, userId: string) => {
      try {
        await BreakoutService.assignHost(breakoutId, userId);
        toast.success('Host assigned');
        await refreshBreakouts();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to assign host';
        toast.error(msg);
        throw err;
      }
    },
    [refreshBreakouts]
  );

  const assignParticipant = useCallback(
    async (breakoutId: string, userId: string) => {
      try {
        await BreakoutService.assignParticipant(breakoutId, userId);
        toast.success('Participant assigned');
        await refreshBreakouts();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to assign participant';
        toast.error(msg);
        throw err;
      }
    },
    [refreshBreakouts]
  );

  const startBreakout = useCallback(
    async (breakoutId: string) => {
      try {
        await BreakoutService.startBreakout(breakoutId);
        toast.success('Breakout is now LIVE');
        await refreshBreakouts();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to start breakout';
        toast.error(msg);
        throw err;
      }
    },
    [refreshBreakouts]
  );

  const closeBreakoutFn = useCallback(
    async (breakoutId: string) => {
      try {
        await BreakoutService.closeBreakout(breakoutId);
        toast.success('Breakout closed');
        if (currentBreakout?.id === breakoutId) setCurrentBreakout(null);
        await refreshBreakouts();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to close breakout';
        toast.error(msg);
        throw err;
      }
    },
    [currentBreakout, refreshBreakouts, setCurrentBreakout]
  );

  const removeParticipantToLobby = useCallback(
    async (breakoutId: string, userId: string) => {
      try {
        await BreakoutService.removeParticipantToLobby(breakoutId, userId);
        toast.success('Participant moved to lobby');
        await refreshBreakouts();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to move participant';
        toast.error(msg);
        throw err;
      }
    },
    [refreshBreakouts]
  );

  // ─── Advanced Child Room & Master Controls ──────────────────

  const createChildRoom = useCallback(
    async (
      parentId: string,
      name: string,
      maxParticipants: number = 10,
      roomType: RoomType = 'GENERAL',
      securityLevel: SecurityLevel = 'STANDARD'
    ) => {
      if (!currentOrganization) return;
      try {
        await BreakoutService.createBreakout(
          currentOrganization.id,
          name,
          maxParticipants,
          effectiveMode || undefined, // inherit current effective mode
          user?.id,
          parentId,
          roomType,
          securityLevel
        );
        toast.success(`Child room "${name}" created inside parent`);
        await refreshBreakouts(); // Native Supabase will nest it beautifully
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to create child room';
        toast.error(msg);
        throw err;
      }
    },
    [currentOrganization, effectiveMode, refreshBreakouts, user?.id]
  );

  const masterBroadcast = useCallback(
    (message: string, targetBreakoutId?: string) => {
      interface SignalingWithEmit {
        emit: (e: string, p: unknown) => void;
      }
      const signaling = (window as unknown as { __cospiraSignaling?: SignalingWithEmit })
        .__cospiraSignaling;
      if (signaling && currentOrganization) {
        signaling.emit('org:master-broadcast:send', {
          orgId: currentOrganization.id,
          message,
          targetBreakoutId,
        });
        toast.success('Broadcast sent globally');
      }
    },
    [currentOrganization]
  );

  const forceTransferUser = useCallback(
    async (userId: string, targetRoomId: string) => {
      try {
        // Behind the scenes this uses batchAssign, which naturally removes from old
        await BreakoutService.batchAssignParticipants(targetRoomId, [userId]);
        toast.success('Participant force transferred');
        await Promise.all([refreshBreakouts(), refreshOrgMembers()]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Transfer failed';
        toast.error(msg);
        throw err;
      }
    },
    [refreshBreakouts, refreshOrgMembers]
  );

  // ─── Phase 10: Mode Switch Guard ──────────────────────────
  // Mode switch is blocked if any breakout is LIVE.
  // Returns true if the switch succeeded, false if blocked.

  const switchOrgMode = useCallback(
    async (mode: OrgMode): Promise<boolean> => {
      if (!currentOrganization) return false;

      // Client-side guard (server enforces too)
      const hasLiveBreakouts = breakouts.some((b) => b.status === 'LIVE');
      if (hasLiveBreakouts) {
        toast.error('Cannot switch mode while a breakout is LIVE', {
          description:
            'Close all active breakout sessions first, then change the organization mode.',
        });
        return false;
      }

      try {
        await BreakoutService.updateOrgMode(currentOrganization.id, mode);
        const badge = ModePolicyResolver.getBadge(mode);
        toast.success(`Organization mode switched to ${badge.emoji} ${badge.label}`);
        await refreshBreakouts();
        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to switch mode';
        toast.error(msg);
        return false;
      }
    },
    [currentOrganization, breakouts, refreshBreakouts]
  );

  // ─── Phase 10: Host Disconnect → Pause/Continue ──────────
  // ULTRA_SECURE: pause breakout when host disconnects.
  // FUN/PROF: breakout continues — host reconnect can be organic.

  const pauseBreakout = useCallback(
    async (breakoutId: string) => {
      try {
        await BreakoutService.pauseBreakout(breakoutId);
        toast.warning('Breakout PAUSED — host disconnected');
        await refreshBreakouts();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to pause breakout';
        toast.error(msg);
        throw err;
      }
    },
    [refreshBreakouts]
  );

  const resumeBreakout = useCallback(
    async (breakoutId: string) => {
      try {
        await BreakoutService.resumeBreakout(breakoutId);
        toast.success('Breakout resumed');
        await refreshBreakouts();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to resume breakout';
        toast.error(msg);
        throw err;
      }
    },
    [refreshBreakouts]
  );

  // ─── AI Kill Switch helpers ─────────────────────────────────
  const killAI = useCallback(() => {
    setAIEnabled(false);
    setAIInsights([]); // clear stale insights on kill
    // Optionally notify backend if signaling is available
    interface SignalingWithEmit {
      emit: (e: string, p: { orgId: string }) => void;
    }
    const signaling = (window as unknown as { __cospiraSignaling?: SignalingWithEmit })
      .__cospiraSignaling;
    if (signaling && currentOrganization) {
      signaling.emit('ai:kill', { orgId: currentOrganization.id });
    }
  }, [currentOrganization]);

  const enableAI = useCallback(() => {
    setAIEnabled(true);
    // Optionally notify backend if signaling is available
    interface SignalingWithEmit {
      emit: (e: string, p: { orgId: string }) => void;
    }
    const signaling = (window as unknown as { __cospiraSignaling?: SignalingWithEmit })
      .__cospiraSignaling;
    if (signaling && currentOrganization) {
      signaling.emit('ai:enable', { orgId: currentOrganization.id });
    }
  }, [currentOrganization]);

  // ─── Org Member Roster helpers ───────────────────────

  const batchAssignParticipants = useCallback(
    async (breakoutId: string, userIds: string[]) => {
      try {
        const result = await BreakoutService.batchAssignParticipants(breakoutId, userIds);
        toast.success(`Assigned ${result.inserted} participants`, {
          description:
            result.skipped > 0 ? `${result.skipped} already assigned or room full` : undefined,
        });
        await Promise.all([refreshBreakouts(), refreshOrgMembers()]);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Batch assign failed';
        toast.error(msg);
        throw err;
      }
    },
    [refreshBreakouts, refreshOrgMembers]
  );

  // ─── Context Value ─────────────────────────────────────────

  return (
    <BreakoutContext.Provider
      value={{
        breakouts,
        lobbyUsers,
        userLocations,
        currentBreakout,
        effectiveMode,
        policy,
        isLoading,
        isReconnecting,
        createBreakout,
        assignHost,
        assignParticipant,
        startBreakout,
        closeBreakout: closeBreakoutFn,
        removeParticipantToLobby,
        createChildRoom,
        masterBroadcast,
        forceTransferUser,
        switchOrgMode,
        pauseBreakout,
        resumeBreakout,
        setCurrentBreakout,
        refreshBreakouts,
        // AI (advisory, read-only)
        aiInsights,
        aiEnabled,
        killAI,
        enableAI,
        // Dispatch Center
        orgMembers,
        isMembersLoading,
        refreshOrgMembers,
        batchAssignParticipants,
      }}
    >
      {children}
    </BreakoutContext.Provider>
  );
};

// ─────────────────────────────────────────────────────────────

export default BreakoutContext;
