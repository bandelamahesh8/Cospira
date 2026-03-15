import { supabase } from '@/integrations/supabase/client';
import {
  Organization,
  OrganizationRole,
  PermissionKey,
  ActivityLog,
  OrgMode,
  OrganizationInvite,
  Permission,
  Project,
  Team,
  TeamMember,
} from '@/types/organization';
import { generateUUID } from '@/utils/uuid';

// Re-cast the global supabase client.
const db = supabase as any;

export class OrganizationService {
  /**
   * Generates a persistent or temporary invite link for the given organization.
   * For the Dispatch Center, we map this to the app's join route.
   */
  static async generateInviteLink(orgId: string): Promise<string> {
    const baseUrl = window.location.origin;
    return `${baseUrl}/join/${orgId}`;
  }

  static async getMyOrganizations(userId?: string): Promise<Organization[]> {
    const { data: authData } = await db.auth.getUser();
    const targetUserId = userId || authData.user?.id;
    if (!targetUserId) return [];

    const { data, error } = await db
      .from('organization_members')
      .select(
        `
        role_id,
        organization_roles (
            id, name, is_system_role
        ),
        organizations!inner (
            id, name, slug, domain, status, owner_id, created_at
        )
      `
      )
      .eq('user_id', targetUserId)
      .neq('organizations.status', 'deleted');

    if (error) {
      console.error('Error fetching orgs:', error);
      throw error;
    }

    interface MyOrgRow {
      role_id: string;
      organization_roles: { id: string; name: string; is_system_role: boolean } | null;
      organizations: {
        id: string;
        name: string;
        slug: string;
        domain: string | null;
        status: Organization['status'];
        owner_id: string;
        created_at: string;
        mode?: OrgMode;
        authorized_only?: boolean | null;
        lobby_name?: string | null;
      } | null;
    }

    // Flatten and enrich
    const orgs = await Promise.all(
      ((data as unknown as MyOrgRow[]) || []).map(async (member) => {
        const org = member.organizations;
        if (!org) return null; // Safety filter

        const role = member.organization_roles;

        // Fetch permissions for this role
        const permissions = role?.id ? await this.getPermissionsForRole(role.id) : [];

        return {
          ...org,
          current_user_role_id: member.role_id,
          role: role?.name, // Backward compat
          current_user_permissions: permissions,
          mode: org.mode || 'PROF', // Default mode
          authorized_only: org.authorized_only || false,
          lobby_name: org.lobby_name || null,
        } as unknown as Organization;
      })
    );

    return orgs.filter(Boolean) as Organization[];
  }

  static async getPermissionsForRole(roleId: string): Promise<PermissionKey[]> {
    if (!roleId) return [];

    const { data, error } = await db
      .from('role_permissions')
      .select(
        `
            permissions ( key )
        `
      )
      .eq('role_id', roleId);

    if (error || !data) return [];

    // Extract keys
    interface RolePermissionRow {
      permissions: { key: PermissionKey } | null;
    }
    return (data as unknown as RolePermissionRow[])
      .map((rp) => rp.permissions?.key)
      .filter(Boolean) as PermissionKey[];
  }

  static hasPermission(org: Organization, key: PermissionKey): boolean {
    return org.current_user_permissions?.includes(key) || false;
  }

  static async createOrganization(
    name: string,
    slug: string,
    mode: OrgMode = 'PROF',
    advanced: { lobby_name?: string; authorized_only?: boolean } = {}
  ): Promise<Organization> {
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: org, error: orgError } = await db
      .from('organizations')
      .insert({
        name,
        slug,
        owner_id: user.id,
        mode,
        status: 'active',
        lobby_name: advanced.lobby_name,
        authorized_only: advanced.authorized_only,
      })
      .select()
      .single();

    if (orgError) throw orgError;

    // Manual Creation for robustness (Best Effort):
    try {
      const { data: roleData } = await db
        .from('organization_roles')
        .insert({
          organization_id: (org as Organization).id,
          name: 'Owner',
          is_system_role: true,
          priority: 0,
          is_deletable: false,
          is_editable: false,
        })
        .select()
        .single();

      if (roleData) {
        await db.from('organization_members').insert({
          organization_id: (org as Organization).id,
          user_id: user.id,
          role_id: (roleData as OrganizationRole).id,
          status: 'active',
        });
      }
    } catch (provisionError) {
      console.warn(
        'Manual org provisioning skipped/failed (likely triggers exist):',
        provisionError
      );
    }

    return { ...(org as Organization), status: 'active' };
  }

  static async deleteOrganization(orgId: string): Promise<void> {
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await db
      .from('organizations')
      .update({
        status: 'deleted',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orgId);

    if (error) {
      console.error('Error deleting organization:', error);
      throw error;
    }
  }

  /**
   * Get Activity Logs (Secure Access)
   */
  static async getActivityLogs(orgId: string): Promise<ActivityLog[]> {
    const { data, error } = await db
      .from('activity_logs')
      .select(
        `
            *,
            actor:actor_id ( email ) 
        `
      )
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return (data || []) as unknown as ActivityLog[];
  }

  /**
   * Joins an organization via its ID (or invite code).
   */
  static async joinOrganizationByCode(orgId: string): Promise<void> {
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Check if already a member
    const { data: existingMember } = await db
      .from('organization_members')
      .select('id')
      .eq('organization_id', orgId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingMember) {
      return;
    }

    // Find the 'Member' role for this org
    let { data: roles } = await db
      .from('organization_roles')
      .select('id')
      .eq('organization_id', orgId)
      .eq('name', 'Member')
      .limit(1);

    if (!roles || roles.length === 0) {
      const { data: fallbackRoles } = await db
        .from('organization_roles')
        .select('id')
        .eq('organization_id', orgId)
        .limit(1);
      roles = fallbackRoles;
    }

    if (!roles || roles.length === 0) {
      throw new Error('No valid roles found in the organization to assign.');
    }

    // Insert member
    const { error: insertError } = await db.from('organization_members').insert({
      organization_id: orgId,
      user_id: user.id,
      role_id: roles[0].id,
    });

    if (insertError) {
      if (insertError.code !== '23505') {
        throw insertError;
      }
    }
  }

  private static async hashToken(token: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  static async getRoles(orgId: string): Promise<OrganizationRole[]> {
    const { data, error } = await db
      .from('organization_roles')
      .select('*')
      .eq('organization_id', orgId);

    if (error) throw error;
    return (data || []) as unknown as OrganizationRole[];
  }

  static async inviteMember(orgId: string, email: string, roleId: string): Promise<string> {
    const rawToken = generateUUID();
    const tokenHash = await this.hashToken(rawToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { error } = await db.from('organization_invites').insert({
      organization_id: orgId,
      email,
      role_id: roleId,
      token_hash: tokenHash,
      expires_at: expiresAt.toISOString(),
      status: 'pending',
      invite_type: 'email',
    });

    if (error) throw error;
    return rawToken;
  }

  static async getPendingInvites(orgId: string): Promise<OrganizationInvite[]> {
    const { data, error } = await db
      .from('organization_invites')
      .select(
        `
            *,
            role:role_id ( name )
        `
      )
      .eq('organization_id', orgId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString());

    if (error) throw error;
    return (data || []) as unknown as OrganizationInvite[];
  }

  static async revokeInvite(inviteId: string): Promise<void> {
    const { error } = await db
      .from('organization_invites')
      .update({ status: 'revoked' })
      .eq('id', inviteId);

    if (error) throw error;
  }

  static async checkInviteToken(rawToken: string): Promise<OrganizationInvite | null> {
    const tokenHash = await this.hashToken(rawToken);

    const { data, error } = await db
      .from('organization_invites')
      .select(
        `
            *,
            organization:organization_id ( name, slug, authorized_only )
        `
      )
      .eq('token_hash', tokenHash)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) return null;
    return data as unknown as OrganizationInvite;
  }

  static async acceptInvite(rawToken: string): Promise<void> {
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user) throw new Error('Authentication required');

    const tokenHash = await this.hashToken(rawToken);

    const { data, error } = await db.rpc('accept_invite_secure', {
      p_token_hash: tokenHash,
      p_user_id: user.id,
    });

    if (error) {
      console.error('Accept Invite Error:', error);
      throw new Error(error.message || 'Failed to accept invitation');
    }

    const result = data as { success: boolean; error?: string } | null;
    if (result && !result.success) {
      throw new Error(result.error || 'Failed to accept invitation');
    }
  }

  static async getAllPermissions(): Promise<Permission[]> {
    const { data, error } = await db.from('permissions').select('*');

    if (error) throw error;
    return (data || []) as unknown as Permission[];
  }

  static async createRole(orgId: string, name: string, priority: number): Promise<void> {
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await db.rpc('create_role_secure', {
      p_org_id: orgId,
      p_name: name,
      p_priority: priority,
      p_actor_id: user.id,
    });

    if (error) throw error;
    const result = data as { success: boolean; error?: string } | null;
    if (result && !result.success) {
      throw new Error(result.error || 'Failed to create role');
    }
  }

  static async deleteRole(roleId: string): Promise<void> {
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await db.rpc('delete_role_safe', {
      p_role_id: roleId,
      p_actor_id: user.id,
    });

    if (error) throw error;
    const result = data as { success: boolean; error?: string } | null;
    if (result && !result.success) {
      throw new Error(result.error || 'Failed to delete role');
    }
  }

  static async updateRolePermissions(roleId: string, newPermissionIds: string[]): Promise<void> {
    const { data: currentPerms, error: fetchError } = await db
      .from('role_permissions')
      .select('permission_id')
      .eq('role_id', roleId);

    if (fetchError) throw fetchError;

    interface RolePermIDRow {
      permission_id: string;
    }
    const currentIds = (currentPerms as unknown as RolePermIDRow[]).map((p) => p.permission_id);

    const toAdd = newPermissionIds.filter((id) => !currentIds.includes(id));
    const toRemove = currentIds.filter((id) => !newPermissionIds.includes(id));

    if (toRemove.length > 0) {
      const { error: removeError } = await db
        .from('role_permissions')
        .delete()
        .eq('role_id', roleId)
        .in('permission_id', toRemove);

      if (removeError) throw removeError;
    }

    if (toAdd.length > 0) {
      const { error: addError } = await db
        .from('role_permissions')
        .insert(toAdd.map((pid) => ({ role_id: roleId, permission_id: pid })));

      if (addError) throw addError;
    }
  }

  static async getProjects(orgId: string): Promise<Project[]> {
    const { data, error } = await db
      .from('projects')
      .select(
        `
            *,
            teams:project_teams(count),
            members:project_members(count)
        `
      )
      .eq('organization_id', orgId)
      .neq('status', 'deleted')
      .order('created_at', { ascending: false });

    if (error) throw error;

    interface ProjectEnrichedRow {
      teams: { count: number }[];
      members: { count: number }[];
    }
    return (data as unknown as (Project & ProjectEnrichedRow)[]).map((p) => ({
      ...p,
      teams_count: p.teams?.[0]?.count || 0,
      members_count: p.members?.[0]?.count || 0,
    }));
  }

  static async createProject(orgId: string, name: string, description?: string): Promise<Project> {
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await db
      .from('projects')
      .insert({
        organization_id: orgId,
        name,
        description,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data as unknown as Project;
  }

  static async deleteProject(projectId: string): Promise<void> {
    const { error } = await db.from('projects').update({ status: 'deleted' }).eq('id', projectId);

    if (error) throw error;
  }

  static async restoreProject(projectId: string): Promise<void> {
    const { error } = await db.from('projects').update({ status: 'active' }).eq('id', projectId);

    if (error) throw error;
  }

  static async getDeletedProjects(orgId: string): Promise<Project[]> {
    const { data, error } = await db
      .from('projects')
      .select(
        `
            *,
            teams:project_teams(count),
            members:project_members(count)
        `
      )
      .eq('organization_id', orgId)
      .eq('status', 'deleted')
      .order('updated_at', { ascending: false });

    if (error) throw error;

    interface ProjectEnrichedRow {
      teams: { count: number }[];
      members: { count: number }[];
    }
    return (data as unknown as (Project & ProjectEnrichedRow)[]).map((p) => ({
      ...p,
      teams_count: p.teams?.[0]?.count || 0,
      members_count: p.members?.[0]?.count || 0,
    }));
  }

  static async hardDeleteProject(projectId: string): Promise<void> {
    const { error } = await db.from('projects').delete().eq('id', projectId);

    if (error) throw error;
  }

  static async getTeams(orgId: string): Promise<Team[]> {
    const { data, error } = await db
      .from('teams')
      .select(
        `
            *,
            members:team_members(count)
        `
      )
      .eq('organization_id', orgId)
      .order('name', { ascending: true });

    if (error) throw error;

    interface TeamEnrichedRow {
      members: { count: number }[];
    }
    return (data as unknown as (Team & TeamEnrichedRow)[]).map((t) => ({
      ...t,
      members_count: t.members?.[0]?.count || 0,
    }));
  }

  static async createTeam(orgId: string, name: string, description?: string): Promise<Team> {
    const { data, error } = await db
      .from('teams')
      .insert({
        organization_id: orgId,
        name,
        description,
      })
      .select()
      .single();

    if (error) throw error;
    return data as unknown as Team;
  }

  static async assignTeamToProject(projectId: string, teamId: string): Promise<void> {
    const {
      data: { user },
    } = await db.auth.getUser();
    const { error } = await db.from('project_teams').insert({
      project_id: projectId,
      team_id: teamId,
      assigned_by: user?.id || null,
    });

    if (error) throw error;
  }

  static async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    const { data, error } = await db
      .from('team_members')
      .select(
        `
            *,
            user:user_id ( id, email, raw_user_meta_data )
        `
      )
      .eq('team_id', teamId);

    if (error) throw error;

    interface TeamMemberEnrichedRow {
      team_id: string;
      user_id: string;
      added_by: string | null;
      created_at: string;
      user: {
        id: string;
        email: string;
        raw_user_meta_data: {
          display_name?: string;
          avatar_url?: string;
        } | null;
      } | null;
    }
    return (data as unknown as TeamMemberEnrichedRow[]).map(
      (tm) =>
        ({
          team_id: tm.team_id,
          user_id: tm.user_id,
          added_by: tm.added_by,
          created_at: tm.created_at,
          user: {
            id: tm.user?.id || '',
            email: tm.user?.email || '',
            display_name: tm.user?.raw_user_meta_data?.display_name,
            avatar_url: tm.user?.raw_user_meta_data?.avatar_url,
          },
        }) as TeamMember
    );
  }

  static async addMemberToTeam(teamId: string, userId: string): Promise<void> {
    const {
      data: { user },
    } = await db.auth.getUser();
    const { error } = await db.from('team_members').insert({
      team_id: teamId,
      user_id: userId,
      added_by: user?.id || null,
    });

    if (error) throw error;
  }

  static async removeMemberFromTeam(teamId: string, userId: string): Promise<void> {
    const { error } = await db
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', userId);

    if (error) throw error;
  }
}
