/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/integrations/supabase/client';
import {
  BreakoutSession,
  BreakoutParticipant,
  BreakoutRole,
  OrgMode,
  RoomType,
  SecurityLevel,
} from '@/types/organization';
import { roomEventBus } from '@/lib/breakout/EventBus';
import { logger } from '@/utils/logger';

// Clean, loosely-typed client for tables/RPCs missing from generated types
const sb: any = supabase;

export interface OrgMember {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  email: string;
  role: string;
  assignedBreakoutId?: string | null; // which child room they're in (null = in lobby)

  // AI Smart Match V1: Mock skills for users
  skills?: string[];
}

export interface RoomEventLog {
  id: string;
  event_type: string;
  breakout_id: string;
  payload: Record<string, unknown>;
  created_at: string;
}

interface RawBreakoutData {
  participants: Array<{ count: number }>;
  child_rooms: Array<RawBreakoutData & BreakoutSession>;
}

export class BreakoutService {
  /**
   * Get all breakout sessions for an organization.
   */
  static async getBreakouts(orgId: string): Promise<BreakoutSession[]> {
    const { data, error } = await sb
      .from('breakout_sessions')
      .select(
        `
        *,
        host:player_profiles ( display_name, avatar_url ),
        participants:breakout_participants ( count ),
        child_rooms:breakout_sessions!parent_breakout_id (
          *,
          host:player_profiles ( display_name, avatar_url ),
          participants:breakout_participants ( count )
        )
      `
      )
      .eq('organization_id', orgId)
      .is('parent_breakout_id', null)
      .neq('status', 'CLOSED')
      .order('created_at', { ascending: true });

    if (error) throw error;

    return (data || []).map((b: any) => {
      const session = b as unknown as RawBreakoutData & BreakoutSession;
      return {
        ...session,
        participants_count: session.participants?.[0]?.count || 0,
        child_rooms: (session.child_rooms || [])
          .filter((c: any) => c.status !== 'CLOSED')
          .map((c: any) => ({
            ...c,
            participants_count: c.participants?.[0]?.count || 0,
          })),
      };
    }) as any;
  }

  /**
   * Get a specific breakout session by ID.
   */
  static async getBreakoutDetails(breakoutId: string): Promise<BreakoutSession | null> {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(breakoutId)) {
      return null;
    }
    const { data, error } = await sb
      .from('breakout_sessions')
      .select(
        `
        *,
        host:player_profiles ( display_name, avatar_url ),
        participants:breakout_participants ( count )
      `
      )
      .eq('id', breakoutId)
      .maybeSingle();

    if (error) {
      console.error('[BreakoutService] Error fetching breakout details:', error);
      return null;
    }

    if (!data) return null;

    const sessionData = data as unknown as RawBreakoutData & BreakoutSession;
    return {
      ...sessionData,
      participants_count: sessionData.participants?.[0]?.count || 0,
    } as any;
  }

  /**
   * Get participants for a specific breakout.
   */
  static async getBreakoutParticipants(breakoutId: string): Promise<BreakoutParticipant[]> {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(breakoutId)) {
      return [];
    }
    interface RawParticipant {
      id: string;
      breakout_id: string;
      user_id: string;
      role: BreakoutRole;
      joined_at: string;
      user: {
        id: string;
        email: string;
        raw_user_meta_data: {
          display_name?: string;
          avatar_url?: string;
        };
      };
    }

    const { data, error } = await sb
      .from('breakout_participants')
      .select(
        `
        *,
        user:user_id ( id, email, raw_user_meta_data )
      `
      )
      .eq('breakout_id', breakoutId);

    if (error) throw error;

    return ((data as unknown as RawParticipant[]) || []).map((p) => ({
      id: p.id,
      breakout_id: p.breakout_id,
      user_id: p.user_id,
      role: p.role as any,
      joined_at: p.joined_at,
      user: {
        id: p.user?.id,
        email: p.user?.email,
        display_name: p.user?.raw_user_meta_data?.display_name,
        avatar_url: p.user?.raw_user_meta_data?.avatar_url,
      },
    }));
  }

  /**
   * Create a new breakout session (Org Owner only).
   */
  static async createBreakout(
    orgId: string,
    name: string,
    maxParticipants: number = 20,
    modeOverride?: OrgMode,
    userId?: string,
    parentBreakoutId?: string,
    roomType: RoomType = 'GENERAL',
    securityLevel: SecurityLevel = 'STANDARD'
  ): Promise<BreakoutSession> {
    let targetUserId = userId;
    if (!targetUserId) {
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      targetUserId = user.id;
    }

    // Ensure the profile exists to satisfy FKEY constraints
    const { data: profileCheck } = await sb
      .from('player_profiles')
      .select('id')
      .eq('id', targetUserId)
      .maybeSingle();

    if (!profileCheck) {
      console.warn('[BreakoutService] Creating missing player profile for host:', targetUserId);
      const { data: profileFallback } = await sb
        .from('profiles')
        .select('*')
        .eq('id', targetUserId)
        .maybeSingle();
      const fallbackData = profileFallback as Record<string, unknown> | null;
      await sb.from('player_profiles').insert({
        id: targetUserId,
        display_name: (fallbackData?.display_name as string) || 'User ' + targetUserId?.slice(0, 4),
        username: (fallbackData?.username as string) || 'user_' + targetUserId?.slice(0, 4),
      });
    }

    console.warn('[BreakoutService] Creating breakout:', { orgId, name, targetUserId });
    const { data, error } = await sb
      .from('breakout_sessions')
      .insert({
        organization_id: orgId,
        name,
        max_participants: maxParticipants,
        mode_override: modeOverride || null,
        status: 'CREATED',
        host_id: targetUserId,
        parent_breakout_id: parentBreakoutId || null,
        room_type: roomType,
        security_level: securityLevel,
      })
      .select()
      .single();

    if (error) throw error;

    const session = data as BreakoutSession;
    roomEventBus.emit('ROOM_STATE_CHANGE', {
      breakoutId: session.id,
      name: session.name,
      status: session.status,
      hostId: session.host_id || '',
      mode: session.mode_override || undefined,
      parentBreakoutId: session.parent_breakout_id || undefined,
    });

    return session;
  }

  /**
   * Assign a host to a breakout. Previous host is removed from breakout.
   */
  static async assignHost(breakoutId: string, userId: string): Promise<void> {
    // Ensure host has a player_profile before assignment
    const { data: profileCheck } = await sb
      .from('player_profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (!profileCheck) {
      console.warn('[BreakoutService] Creating missing player profile for assigned host:', userId);
      const { data: profileFallback } = await sb
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      const fallbackData = profileFallback as Record<string, unknown> | null;
      await sb.from('player_profiles').insert({
        id: userId,
        display_name: (fallbackData?.display_name as string) || 'User ' + userId.slice(0, 4),
        username: (fallbackData?.username as string) || 'user_' + userId.slice(0, 4),
      });
    }

    const { error: updateError } = await sb
      .from('breakout_sessions')
      .update({ host_id: userId })
      .eq('id', breakoutId);

    if (updateError) throw updateError;

    // Upsert the host as a HOST-role participant
    await this.upsertParticipant(breakoutId, userId, 'HOST');

    roomEventBus.emit('ROOM_STATE_CHANGE', {
      breakoutId,
      hostId: userId,
    });
    roomEventBus.emit('USER_JOIN', {
      breakoutId,
      userId,
    });
  }

  /**
   * Assign a regular participant to a breakout.
   */
  static async assignParticipant(breakoutId: string, userId: string): Promise<void> {
    // Check current participant count vs max_participants
    const { data: session, error: sessionError } = await sb
      .from('breakout_sessions')
      .select('max_participants, breakout_participants(count)')
      .eq('id', breakoutId)
      .single();

    if (sessionError) throw sessionError;

    const sessionData = session as unknown as {
      max_participants: number;
      breakout_participants: Array<{ count: number }>;
    };
    const currentCount = sessionData?.breakout_participants?.[0]?.count || 0;
    if (currentCount >= (sessionData?.max_participants || 0)) {
      throw new Error('Breakout is at full capacity.');
    }

    await this.upsertParticipant(breakoutId, userId, 'PARTICIPANT');

    roomEventBus.emit('USER_JOIN', {
      breakoutId,
      userId,
    });
  }

  /**
   * Internal: upsert a participant row (handles duplicates gracefully).
   */
  private static async upsertParticipant(
    breakoutId: string,
    userId: string,
    role: 'HOST' | 'PARTICIPANT'
  ): Promise<void> {
    const { error } = await sb
      .from('breakout_participants')
      .upsert(
        { breakout_id: breakoutId, user_id: userId, role },
        { onConflict: 'breakout_id,user_id' }
      );

    if (error) throw error;
  }

  /**
   * Remove a specific user from a breakout (move them back to lobby).
   */
  static async removeParticipantToLobby(breakoutId: string, userId: string): Promise<void> {
    const { error } = await sb
      .from('breakout_participants')
      .delete()
      .eq('breakout_id', breakoutId)
      .eq('user_id', userId);

    if (error) throw error;

    roomEventBus.emit('USER_LEAVE', {
      breakoutId,
      userId,
    });
  }

  /**
   * Start a breakout — transitions status to LIVE.
   */
  static async startBreakout(breakoutId: string): Promise<void> {
    const { data: session, error: fetchError } = await sb
      .from('breakout_sessions')
      .select('host_id, status')
      .eq('id', breakoutId)
      .single();

    if (fetchError) throw fetchError;
    if (!session?.host_id) throw new Error('Cannot start breakout: no host assigned.');
    if (session?.status !== 'CREATED') throw new Error('Breakout is not in CREATED state.');

    const { error } = await sb
      .from('breakout_sessions')
      .update({ status: 'LIVE' })
      .eq('id', breakoutId);

    if (error) throw error;

    roomEventBus.emit('ROOM_STATE_CHANGE', {
      breakoutId,
      status: 'LIVE',
    });
  }

  /**
   * Close a breakout session.
   */
  static async closeBreakout(breakoutId: string): Promise<void> {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(breakoutId)) {
      return;
    }
    const { error } = await sb
      .from('breakout_sessions')
      .update({ status: 'CLOSED' })
      .eq('id', breakoutId);

    if (error) throw error;

    roomEventBus.emit('ROOM_STATE_CHANGE', {
      breakoutId,
      status: 'CLOSED',
    });
  }

  /**
   * Delete a breakout session permanently.
   */
  static async deleteBreakout(breakoutId: string): Promise<void> {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(breakoutId)) {
      return;
    }
    const { error } = await sb.from('breakout_sessions').delete().eq('id', breakoutId);

    if (error) throw error;

    roomEventBus.emit('ROOM_STATE_CHANGE', {
      breakoutId,
      status: 'CLOSED',
    });
  }

  /**
   * Update org mode.
   */
  static async updateOrgMode(orgId: string, mode: OrgMode): Promise<void> {
    const { error } = await sb.from('organizations').update({ mode }).eq('id', orgId);

    if (error) throw error;
  }

  /**
   * Delete all breakout sessions for an organization permanently.
   */
  static async deleteAllBreakouts(orgId: string): Promise<void> {
    const { error } = await sb
      .from('breakout_sessions')
      .delete()
      .eq('organization_id', orgId);

    if (error) throw error;

    roomEventBus.emit('ROOM_STATE_CHANGE', {
      breakoutId: '',
      status: 'CLOSED',
    });
  }

  /**
   * Delete an entire organization permanently.
   */
  static async deleteOrganization(orgId: string): Promise<void> {
    const { error } = await sb.from('organizations').delete().eq('id', orgId);

    if (error) throw error;
  }

  /**
   * Pause a breakout.
   */
  static async pauseBreakout(breakoutId: string): Promise<void> {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(breakoutId)) {
      return;
    }
    const { data: session, error: fetchError } = await sb
      .from('breakout_sessions')
      .select('status')
      .eq('id', breakoutId)
      .single();

    if (fetchError) throw fetchError;
    if (session?.status !== 'LIVE') throw new Error('Only LIVE breakouts can be paused.');

    const { error } = await sb
      .from('breakout_sessions')
      .update({ status: 'PAUSED' })
      .eq('id', breakoutId);

    if (error) throw error;

    roomEventBus.emit('ROOM_STATE_CHANGE', {
      breakoutId,
      status: 'PAUSED',
    });
  }

  /**
   * Resume a PAUSED breakout.
   */
  static async resumeBreakout(breakoutId: string): Promise<void> {
    const { data: session, error: fetchError } = await sb
      .from('breakout_sessions')
      .select('status, host_id')
      .eq('id', breakoutId)
      .single();

    if (fetchError) throw fetchError;
    if (session?.status !== 'PAUSED') throw new Error('Only PAUSED breakouts can be resumed.');
    if (!session?.host_id) throw new Error('No host assigned — cannot resume.');

    const { error } = await sb
      .from('breakout_sessions')
      .update({ status: 'LIVE' })
      .eq('id', breakoutId);

    if (error) throw error;

    roomEventBus.emit('ROOM_STATE_CHANGE', {
      breakoutId,
      status: 'LIVE',
    });
  }

  /**
   * Fetch all members of an organization with their lobby/room assignment status.
   */
  static async getOrgMembers(orgId: string): Promise<OrgMember[]> {
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // --- PHASE 1: Try Secure RPC ---
    const { data: membersData, error: membersError } = await sb.rpc(
      'get_organization_members_secure',
      {
        p_org_id: orgId,
      }
    );

    if (!membersError && membersData && (membersData as unknown[]).length > 0) {
      const { data: assignments } = await sb
        .from('breakout_participants')
        .select('user_id, breakout_id, breakout_sessions!inner(organization_id)')
        .eq('breakout_sessions.organization_id', orgId);

      const assignmentMap = new Map<string, string>();
      ((assignments as unknown as Record<string, unknown>[]) || []).forEach((a) => {
        if (a && typeof a.user_id === 'string' && typeof a.breakout_id === 'string') {
          assignmentMap.set(a.user_id, a.breakout_id);
        }
      });

      return (membersData as unknown as Record<string, unknown>[]).map((m): OrgMember => {
        const profile = (m.profiles || m.player_profiles || m) as Record<string, unknown>;
        const roles = (m.organization_roles || {}) as Record<string, unknown>;
        return {
          user_id: m.user_id as string,
          display_name: (profile.display_name as string) || 'Unknown',
          avatar_url: (profile.avatar_url as string) || null,
          email: (profile.email as string) || '',
          role: (roles.name as string) || (m.role_name as string) || 'Participant',
          assignedBreakoutId: assignmentMap.get(m.user_id as string) || null,
        };
      });
    }

    // --- Phase 3 Minimal Fetch (Manual Join) ---
    logger.info('[BreakoutService] Trying minimal fetch (profiles + roles)...');
    const { data: minimalData } = await sb
      .from('organization_members')
      .select('user_id, role_id')
      .eq('organization_id', orgId);

    if (minimalData && minimalData.length > 0) {
      const userIds = minimalData.map((m: Record<string, unknown>) => m.user_id as string);
      const roleIds = minimalData
        .map((m: Record<string, unknown>) => m.role_id as string)
        .filter(Boolean);

      const [profilesRes, playerProfilesRes, rolesRes, orgRes, assignmentsRes] = await Promise.all([
        sb.from('profiles').select('*').in('id', userIds),
        sb.from('player_profiles').select('*').in('id', userIds),
        sb.from('organization_roles').select('id, name').in('id', roleIds),
        sb.from('organizations').select('owner_id').eq('id', orgId).single(),
        sb
          .from('breakout_participants')
          .select('user_id, breakout_id, breakout_sessions!inner(organization_id)')
          .eq('breakout_sessions.organization_id', orgId),
      ]);

      const profileMap = new Map<string, Record<string, unknown>>();
      (profilesRes.data || []).forEach((p: Record<string, unknown>) =>
        profileMap.set(p.id as string, { ...profileMap.get(p.id as string), ...p })
      );
      (playerProfilesRes.data || []).forEach((p: Record<string, unknown>) =>
        profileMap.set(p.id as string, { ...profileMap.get(p.id as string), ...p })
      );

      const roleMap = new Map<string, string>();
      (rolesRes.data || []).forEach((r: Record<string, unknown>) =>
        roleMap.set(r.id as string, r.name as string)
      );

      const assignmentMap = new Map<string, string>();
      (assignmentsRes.data || []).forEach((a: Record<string, unknown>) =>
        assignmentMap.set(a.user_id as string, a.breakout_id as string)
      );

      const ownerId = orgRes.data?.owner_id;

      return minimalData.map((m: Record<string, unknown>): OrgMember => {
        const userId = m.user_id as string;
        const p = profileMap.get(userId) || {};
        const roleId = m.role_id as string;
        let roleName = roleMap.get(roleId) || 'Member';

        if (userId === ownerId && !roleName.toLowerCase().includes('host') && !roleName.toLowerCase().includes('owner')) {
          roleName = 'Superhost';
        }

        return {
          user_id: userId,
          display_name: (p.display_name as string) || (p.username as string) || 'User ' + userId.slice(0, 4),
          avatar_url: (p.avatar_url as string) || null,
          email: (p.email as string) || '',
          role: roleName,
          assignedBreakoutId: assignmentMap.get(userId) || null,
        };
      });
    }

    return [];
  }

  /**
   * Batch assign multiple participants.
   */
  static async batchAssignParticipants(
    breakoutId: string,
    userIds: string[]
  ): Promise<{ inserted: number; skipped: number }> {
    const { data, error } = await sb.rpc('batch_assign_participants', {
      p_breakout_id: breakoutId,
      p_user_ids: userIds,
    });

    if (error) throw error;

    const result = data as {
      success: boolean;
      error?: string;
      inserted?: number;
      skipped?: number;
    };
    if (!result?.success) {
      throw new Error(result?.error || 'Batch assign failed');
    }

    userIds.forEach((userId) => {
      roomEventBus.emit('USER_JOIN', { breakoutId, userId });
    });

    return { inserted: result.inserted || 0, skipped: result.skipped || 0 };
  }

  /**
   * Get historical event logs for a specific room.
   */
  static async getRoomHistory(breakoutId: string): Promise<RoomEventLog[]> {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(breakoutId)) {
      return [];
    }
    const { data, error } = await sb
      .from('room_event_logs')
      .select('*')
      .eq('breakout_id', breakoutId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []) as RoomEventLog[];
  }
}
