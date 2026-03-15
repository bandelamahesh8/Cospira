/* eslint-disable react-hooks/exhaustive-deps */
/**
 * usePolicyEngine — React hook for the Dynamic Policy Engine
 *
 * Provides:
 *  - policies: list of active policies for the room
 *  - aiSuggestions: AI-generated governance suggestions (advisory only)
 *  - CRUD operations: createPolicy, updatePolicy, deletePolicy, togglePolicy
 *  - applySmartMode: applies a preset Smart Room Mode policy set
 *  - dryRun: evaluates a condition without applying it
 *  - approveSuggestion / dismissSuggestion: AI suggestion controls
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface PolicyCondition {
  field: string; // 'participants', 'user.role', 'time_elapsed_minutes', 'room.state'
  operator: string; // '>', '<', '>=', '<=', '==', '!='
  value: string | number;
}

export interface Policy {
  policyId: string;
  name: string;
  condition: PolicyCondition;
  action: string; // POLICY_ACTIONS enum value
  priority: number;
  enabled: boolean;
  createdBy: string;
  createdAt: string;
}

export interface AISuggestion {
  id: string;
  message: string;
  suggestedAction: string | null;
  roomId: string;
  timestamp: string;
  approved: boolean;
}

export interface CreatePolicyInput {
  name: string;
  condition: PolicyCondition;
  action: string;
  priority?: number;
}

interface UsePolicyEngineReturn {
  policies: Policy[];
  aiSuggestions: AISuggestion[];
  isLoading: boolean;
  lastTriggered: { name: string; action: string }[] | null;
  createPolicy: (data: CreatePolicyInput) => void;
  updatePolicy: (policyId: string, updates: Partial<Policy>) => void;
  deletePolicy: (policyId: string) => void;
  togglePolicy: (policyId: string, enabled: boolean) => void;
  applySmartMode: (modeName: 'PRESENTATION' | 'TOWNHALL' | 'LECTURE' | 'WORKSHOP') => void;
  dryRun: (condition: PolicyCondition, testContext: object) => Promise<{ matches: boolean }>;
  approveSuggestion: (suggestionId: string) => void;
  dismissSuggestion: (suggestionId: string) => void;
  refresh: () => void;
}

export function usePolicyEngine(
  roomId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  socket: any
): UsePolicyEngineReturn {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [aiSuggestions, setAISuggestions] = useState<AISuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastTriggered, setLastTriggered] = useState<{ name: string; action: string }[] | null>(
    null
  );
  const dryRunResolvers = useRef<Map<string, (result: { matches: boolean }) => void>>(new Map());

  // ─── Fetch policies on mount and when roomId changes ─────────────────────
  const refresh = useCallback(() => {
    if (!socket || !roomId) return;
    setIsLoading(true);
    socket.emit('policy:list', { roomId });
  }, [socket, roomId]);

  useEffect(() => {
    if (!socket) return;
    refresh();
  }, [refresh]);

  // ─── Socket event listeners ───────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const onList = ({
      roomId: rid,
      policies: p,
      aiSuggestions: ai,
    }: {
      roomId: string;
      policies: Policy[];
      aiSuggestions: AISuggestion[];
    }) => {
      if (rid !== roomId) return;
      setPolicies(p ?? []);
      setAISuggestions(ai ?? []);
      setIsLoading(false);
    };

    const onCreated = ({ policy }: { policy: Policy }) => setPolicies((prev) => [...prev, policy]);

    const onUpdated = ({ policyId, updates }: { policyId: string; updates: Partial<Policy> }) =>
      setPolicies((prev) => prev.map((p) => (p.policyId === policyId ? { ...p, ...updates } : p)));

    const onDeleted = ({ policyId }: { policyId: string }) =>
      setPolicies((prev) => prev.filter((p) => p.policyId !== policyId));

    const onToggled = ({ policyId, enabled }: { policyId: string; enabled: boolean }) =>
      setPolicies((prev) => prev.map((p) => (p.policyId === policyId ? { ...p, enabled } : p)));

    const onTriggered = ({
      policies: triggered,
    }: {
      policies: { name: string; action: string }[];
    }) => {
      setLastTriggered(triggered);
      setTimeout(() => setLastTriggered(null), 5000);
    };

    const onSmartMode = ({ policies: newPolicies }: { policies: Policy[] }) =>
      setPolicies((prev) => [...prev, ...newPolicies]);

    const onAISuggestion = (suggestion: AISuggestion) =>
      setAISuggestions((prev) => [suggestion, ...prev].slice(0, 20));

    const onSuggestionApproved = ({ suggestionId }: { suggestionId: string }) =>
      setAISuggestions((prev) =>
        prev.map((s) => (s.id === suggestionId ? { ...s, approved: true } : s))
      );

    const onSuggestionDismissed = ({ suggestionId }: { suggestionId: string }) =>
      setAISuggestions((prev) => prev.filter((s) => s.id !== suggestionId));

    const onDryRunResult = (result: { matches: boolean; _reqId?: string }) => {
      const resolve = dryRunResolvers.current.get('pending');
      if (resolve) {
        resolve({ matches: result.matches });
        dryRunResolvers.current.delete('pending');
      }
    };

    socket.on('policy:list', onList);
    socket.on('policy:created', onCreated);
    socket.on('policy:updated', onUpdated);
    socket.on('policy:deleted', onDeleted);
    socket.on('policy:toggled', onToggled);
    socket.on('policy:triggered', onTriggered);
    socket.on('policy:smart_mode_applied', onSmartMode);
    socket.on('ai:suggestion', onAISuggestion);
    socket.on('ai:suggestion_approved', onSuggestionApproved);
    socket.on('ai:suggestion_dismissed', onSuggestionDismissed);
    socket.on('policy:dry_run_result', onDryRunResult);

    return () => {
      socket.off('policy:list', onList);
      socket.off('policy:created', onCreated);
      socket.off('policy:updated', onUpdated);
      socket.off('policy:deleted', onDeleted);
      socket.off('policy:toggled', onToggled);
      socket.off('policy:triggered', onTriggered);
      socket.off('policy:smart_mode_applied', onSmartMode);
      socket.off('ai:suggestion', onAISuggestion);
      socket.off('ai:suggestion_approved', onSuggestionApproved);
      socket.off('ai:suggestion_dismissed', onSuggestionDismissed);
      socket.off('policy:dry_run_result', onDryRunResult);
    };
  }, [socket, roomId]);

  // ─── Actions ──────────────────────────────────────────────────────────────

  const createPolicy = useCallback(
    (data: CreatePolicyInput) => {
      socket?.emit('policy:create', { roomId, policy: data });
    },
    [socket, roomId]
  );

  const updatePolicy = useCallback(
    (policyId: string, updates: Partial<Policy>) => {
      socket?.emit('policy:update', { roomId, policyId, updates });
    },
    [socket, roomId]
  );

  const deletePolicy = useCallback(
    (policyId: string) => {
      socket?.emit('policy:delete', { roomId, policyId });
    },
    [socket, roomId]
  );

  const togglePolicy = useCallback(
    (policyId: string, enabled: boolean) => {
      socket?.emit('policy:toggle', { roomId, policyId, enabled });
    },
    [socket, roomId]
  );

  const applySmartMode = useCallback(
    (modeName: 'PRESENTATION' | 'TOWNHALL' | 'LECTURE' | 'WORKSHOP') => {
      socket?.emit('policy:apply_smart_mode', { roomId, modeName });
    },
    [socket, roomId]
  );

  const dryRun = useCallback(
    (condition: PolicyCondition, testContext: object): Promise<{ matches: boolean }> => {
      return new Promise((resolve) => {
        dryRunResolvers.current.set('pending', resolve);
        socket?.emit('policy:dry_run', { roomId, condition, testContext });
        // Timeout after 3s
        setTimeout(() => {
          dryRunResolvers.current.delete('pending');
          resolve({ matches: false });
        }, 3000);
      });
    },
    [socket, roomId]
  );

  const approveSuggestion = useCallback(
    (suggestionId: string) => {
      socket?.emit('ai:approve_suggestion', { roomId, suggestionId });
    },
    [socket, roomId]
  );

  const dismissSuggestion = useCallback(
    (suggestionId: string) => {
      socket?.emit('ai:dismiss_suggestion', { roomId, suggestionId });
    },
    [socket, roomId]
  );

  return {
    policies,
    aiSuggestions,
    isLoading,
    lastTriggered,
    createPolicy,
    updatePolicy,
    deletePolicy,
    togglePolicy,
    applySmartMode,
    dryRun,
    approveSuggestion,
    dismissSuggestion,
    refresh,
  };
}
