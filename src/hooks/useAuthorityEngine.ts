/**
 * useAuthorityEngine — React hook for the Distributed Authority Engine
 *
 * Provides:
 *  - myRole: the current user's authority role
 *  - roster: full authority roster for the room
 *  - grantRole / revokeRole: role management (host/cohost/moderator only)
 *  - canPerformAction: permission checker
 */

import { useState, useEffect, useCallback } from 'react';

export type AuthorityRole = 'HOST' | 'COHOST' | 'MODERATOR' | 'SPEAKER' | 'LISTENER';

export interface RosterEntry {
  userId: string;
  role: AuthorityRole;
  grantedBy?: string;
  grantedAt?: string;
}

export const ROLE_BADGE_COLORS: Record<AuthorityRole, string> = {
  HOST: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  COHOST: 'bg-slate-400/20 text-slate-300 border-slate-400/30',
  MODERATOR: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  SPEAKER: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  LISTENER: 'bg-white/5 text-slate-500 border-white/10',
};

export const ROLE_WEIGHTS: Record<AuthorityRole, number> = {
  HOST: 100,
  COHOST: 80,
  MODERATOR: 60,
  SPEAKER: 40,
  LISTENER: 20,
};

interface UseAuthorityEngineReturn {
  myRole: AuthorityRole;
  roster: RosterEntry[];
  isLoading: boolean;
  lastPromotion: { newHostId: string; reason: string } | null;
  grantRole: (targetUserId: string, newRole: AuthorityRole) => void;
  revokeRole: (targetUserId: string) => void;
  canManage: boolean; // true if HOST / COHOST / MODERATOR
  canKick: boolean;
  refresh: () => void;
}

export function useAuthorityEngine(
  roomId: string,
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  socket: any
): UseAuthorityEngineReturn {
  const [myRole, setMyRole] = useState<AuthorityRole>('LISTENER');
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastPromotion, setLastPromotion] = useState<{ newHostId: string; reason: string } | null>(
    null
  );

  const refresh = useCallback(() => {
    if (!socket || !roomId) return;
    setIsLoading(true);
    socket.emit('authority:get_roster', { roomId });
  }, [socket, roomId]);

  useEffect(() => {
    if (!socket) return;
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!socket) return;

    const onRoster = ({
      roomId: rid,
      roster: r,
      myRole: mr,
    }: {
      roomId: string;
      roster: RosterEntry[];
      myRole: AuthorityRole;
    }) => {
      if (rid !== roomId) return;
      setRoster(r ?? []);
      setMyRole(mr ?? 'LISTENER');
      setIsLoading(false);
    };

    const onRoleGranted = ({
      userId: uid,
      newRole,
    }: {
      userId: string;
      newRole: AuthorityRole;
    }) => {
      setRoster((prev) => {
        const next = prev.filter((r) => r.userId !== uid);
        next.push({ userId: uid, role: newRole, grantedAt: new Date().toISOString() });
        return next;
      });
      if (uid === userId) setMyRole(newRole);
    };

    const onRoleRevoked = ({ userId: uid }: { userId: string }) => {
      setRoster((prev) => prev.filter((r) => r.userId !== uid));
      if (uid === userId) setMyRole('LISTENER');
    };

    const onHostPromoted = ({ newHostId, reason }: { newHostId: string; reason: string }) => {
      setLastPromotion({ newHostId, reason });
      if (newHostId === userId) setMyRole('HOST');
      setRoster((prev) =>
        prev.map((r) => {
          if (r.userId === newHostId) return { ...r, role: 'HOST' };
          if (r.role === 'HOST' && r.userId !== newHostId) return { ...r, role: 'COHOST' };
          return r;
        })
      );
      setTimeout(() => setLastPromotion(null), 8000);
    };

    socket.on('authority:roster', onRoster);
    socket.on('authority:role_granted', onRoleGranted);
    socket.on('authority:role_revoked', onRoleRevoked);
    socket.on('authority:host_promoted', onHostPromoted);

    return () => {
      socket.off('authority:roster', onRoster);
      socket.off('authority:role_granted', onRoleGranted);
      socket.off('authority:role_revoked', onRoleRevoked);
      socket.off('authority:host_promoted', onHostPromoted);
    };
  }, [socket, roomId, userId]);

  const grantRole = useCallback(
    (targetUserId: string, newRole: AuthorityRole) => {
      socket?.emit('authority:grant_role', { roomId, targetUserId, newRole });
    },
    [socket, roomId]
  );

  const revokeRole = useCallback(
    (targetUserId: string) => {
      socket?.emit('authority:revoke_role', { roomId, targetUserId });
    },
    [socket, roomId]
  );

  const canManage = ['HOST', 'COHOST', 'MODERATOR'].includes(myRole);
  const canKick = ['HOST', 'COHOST', 'MODERATOR'].includes(myRole);

  return {
    myRole,
    roster,
    isLoading,
    lastPromotion,
    grantRole,
    revokeRole,
    canManage,
    canKick,
    refresh,
  };
}
