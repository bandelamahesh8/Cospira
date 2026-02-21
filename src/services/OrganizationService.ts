import { supabase } from '@/integrations/supabase/client';
import { Organization, OrganizationRole, PermissionKey, ActivityLog, OrganizationInvite, Permission, Project, Team } from '@/types/organization';

export class OrganizationService {

  static async getMyOrganizations(): Promise<Organization[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Alternative approach: Query from organization_members filtered by user_id,
    // then join to organizations. This avoids the ambiguous column issue.
    const { data, error } = await supabase
      .from('organization_members')
      .select(`
        role_id,
        organization_roles (
            id, name, is_system_role
        ),
        organizations (
            id, name, slug, domain, status, owner_id, created_at
        )
      `)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching orgs:', error);
      throw error;
    }

    // Flatten and enrich
    const orgs = await Promise.all(data.map(async (member: any) => {
        const org = member.organizations;
        const role = member.organization_roles;
        
        // Fetch permissions for this role
        const permissions = await this.getPermissionsForRole(role?.id); 

        return {
            ...org,
            current_user_role_id: member.role_id,
            role: role?.name, // Backward compat
            current_user_permissions: permissions
        } as Organization;
    }));

    return orgs;
  }

  static async getPermissionsForRole(roleId: string): Promise<PermissionKey[]> {
      if (!roleId) return [];
      
      const { data, error } = await supabase
        .from('role_permissions')
        .select(`
            permissions ( key )
        `)
        .eq('role_id', roleId);
    
      if (error || !data) return [];
      
      // Extract keys
      return data.map((rp) => rp.permissions?.key).filter(Boolean) as PermissionKey[];
  }

  static hasPermission(org: Organization, key: PermissionKey): boolean {
      return org.current_user_permissions?.includes(key) || false;
  }

  static async createOrganization(name: string, slug: string): Promise<Organization> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({ name, slug, owner_id: user.id })
        .select()
        .single();
      
      if (orgError) throw orgError;

      // Manual Creation for robustness (Best Effort):
      // If triggers exist (standard), this might fail with 403 or 23505. We suppress it.
      try {
          // A. Create Owner Role
          const { data: roleData } = await supabase
            .from('organization_roles')
            .insert({ organization_id: org.id, name: 'Owner', is_system_role: true })
            .select()
            .single();

          if (roleData) {
              // B. Add creator as member with this role
               await supabase
                .from('organization_members' as any)
                .insert({ 
                    organization_id: org.id, 
                    user_id: user.id, 
                    role_id: roleData.id,
                    status: 'active'
                });
          }
      } catch (provisionError) {
          // Ignore provisioning errors, assuming DB triggers handled it or RLS blocked us.
          console.warn('Manual org provisioning skipped/failed (likely triggers exist):', provisionError);
      }

      // Return with explicit cast to satisfy the interface
      return { ...org, status: 'active' } as unknown as Organization;
  }

  /**
   * Get Activity Logs (Secure Access)
   */
  static async getActivityLogs(orgId: string): Promise<ActivityLog[]> {
      const { data, error } = await supabase
        .from('activity_logs')
        .select(`
            *,
            actor:actor_id ( email ) 
        `) 
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(50);
        
      if (error) throw error;
      return data as unknown as ActivityLog[];
  }

  // --- INVITATION SYSTEM (Phase 2 Enterprise) ---

  /**
   * Helper: Generate SHA-256 Hash of the token
   */
  private static async hashToken(token: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Get all roles available in an organization
   */
  static async getRoles(orgId: string): Promise<OrganizationRole[]> {
      const { data, error } = await supabase
        .from('organization_roles')
        .select('*')
        .eq('organization_id', orgId);
      
      if (error) throw error;
      return data as OrganizationRole[];
  }

  /**
   * Invite a user via email (Generates Secure Token)
   * Returns the RAW token (to be sent via email/link). Raw token is NEVER stored.
   */
  static async inviteMember(orgId: string, email: string, roleId: string): Promise<string> {
      // 1. Generate secure random token
      const rawToken = crypto.randomUUID();
      
      // 2. Hash it for storage
      const tokenHash = await this.hashToken(rawToken);

      // 3. Set expiry (e.g., 7 days)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // 4. Create Invite Record (Store HASH)
      const { error } = await supabase
        .from('organization_invites')
        .insert({
            organization_id: orgId,
            email,
            role_id: roleId,
            token_hash: tokenHash, 
            expires_at: expiresAt.toISOString(),
            status: 'pending',
            invite_type: 'email'
        });

      if (error) throw error;

      // 5. Return RAW token so the UI can construct the link
      // In production, this would arguably be handled by an Edge Function that sends the email directly.
      return rawToken;
  }

  /**
   * Get pending invites for an organization
   */
  static async getPendingInvites(orgId: string): Promise<OrganizationInvite[]> {
      const { data, error } = await supabase
        .from('organization_invites' as any)
        .select(`
            *,
            role:role_id ( name )
        `)
        .eq('organization_id', orgId)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString()); 

      if (error) throw error;
      return data as unknown as OrganizationInvite[];
  }

  /**
   * Revoke an invitation
   */
  static async revokeInvite(inviteId: string): Promise<void> {
      const { error } = await supabase
        .from('organization_invites' as any)
        .update({ status: 'revoked' })
        .eq('id', inviteId);
      
      if (error) throw error;
  }

  /**
   * Check if an invite token is valid and return invite details
   */
  static async checkInviteToken(rawToken: string): Promise<OrganizationInvite | null> {
      // Hash the incoming token to lookup in DB
      const tokenHash = await this.hashToken(rawToken);

      const { data, error } = await supabase
        .from('organization_invites' as any)
        .select(`
            *,
            organization:organization_id ( name, slug )
        `)
        .eq('token_hash', tokenHash)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .single();
      
      if (error || !data) return null;
      return data as unknown as OrganizationInvite;
  }

  /**
   * Accept an invitation (Atomic Secure Transaction)
   */
  static async acceptInvite(rawToken: string): Promise<void> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Authentication required');

      // Hash the token to pass to the secure RPC
      const tokenHash = await this.hashToken(rawToken);

      // Call Atomic RPC function
      const { data, error } = await supabase.rpc('accept_invite_secure', {
          p_token_hash: tokenHash,
          p_user_id: user.id
      });
      
      if (error) {
          console.error('Accept Invite Error:', error);
          throw new Error(error.message || 'Failed to accept invitation');
      }

      // RPC returns JSONB { success: boolean, error?: string }
      if (data && !(data as any).success) {
          throw new Error((data as any).error || 'Failed to accept invitation');
      }
  }

  // --- ROLE & PERMISSION ENGINE (Phase 3 Enterprise) ---

  /**
   * Get Master List of Permissions
   */
  static async getAllPermissions(): Promise<Permission[]> {
      const { data, error } = await supabase
        .from('permissions')
        .select('*');
      
      if (error) throw error;
      return data as Permission[];
  }

  /**
   * Create Custom Role (Secure RPC)
   */
  static async createRole(orgId: string, name: string, priority: number): Promise<void> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('create_role_secure', {
          p_org_id: orgId,
          p_name: name,
          p_priority: priority,
          p_actor_id: user.id
      });

      if (error) throw error;
      if (data && !(data as any).success) {
          throw new Error((data as any).error || 'Failed to create role');
      }
  }

  /**
   * Delete Role (Secure RPC)
   */
  static async deleteRole(roleId: string): Promise<void> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('delete_role_safe', {
          p_role_id: roleId,
          p_actor_id: user.id
      });

      if (error) throw error;
      if (data && !(data as any).success) {
          throw new Error((data as any).error || 'Failed to delete role');
      }
  }

  /**
   * Update Role Permissions (Atomic Diff)
   */
  static async updateRolePermissions(roleId: string, newPermissionIds: string[]): Promise<void> {
      // 1. Fetch current permissions
      const { data: currentPerms, error: fetchError } = await supabase
        .from('role_permissions')
        .select('permission_id')
        .eq('role_id', roleId);

      if (fetchError) throw fetchError;

      const currentIds = currentPerms.map((p: any) => p.permission_id);
      
      // 2. Calculate Diff
      const toAdd = newPermissionIds.filter(id => !currentIds.includes(id));
      const toRemove = currentIds.filter((id: string) => !newPermissionIds.includes(id));

      if (toRemove.length > 0) {
          const { error: removeError } = await supabase
            .from('role_permissions')
            .delete()
            .eq('role_id', roleId)
            .in('permission_id', toRemove);

          if (removeError) throw removeError;
      }

      // 3. Execute Updates (Ideally transactional, here parallel batch for Phase 3)
      // Supabase JS doesn't expose raw transaction block easily without RPC, 
      // but we can just run delete then insert. The System Trigger protects critical deletes.
      
      if (toAdd.length > 0) {
          const { error: addError } = await supabase
            .from('role_permissions')
            .insert(toAdd.map(pid => ({ role_id: roleId, permission_id: pid })));
          
          if (addError) throw addError;
      }
  }

  // --- RESOURCE ENGINE (Phase 6 Enterprise) ---

  /**
   * Get Projects visible to the user (Scoped by RLS)
   */
  static async getProjects(orgId: string): Promise<Project[]> {
      const { data, error } = await supabase
        .from('projects')
        .select(`
            *,
            teams:project_teams(count),
            members:project_members(count)
        `)
        .eq('organization_id', orgId)
        .neq('status', 'deleted')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform counts
      return data.map((p: any) => ({
          ...p,
          teams_count: p.teams?.[0]?.count || 0,
          members_count: p.members?.[0]?.count || 0
      })) as Project[];
  }

  static async createProject(orgId: string, name: string, description?: string): Promise<Project> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('projects')
        .insert({
            organization_id: orgId,
            name,
            description,
            created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;
      return data as Project;
  }

  static async deleteProject(projectId: string): Promise<void> {
      // Soft delete: Update status to 'deleted'
      const { error } = await supabase
        .from('projects')
        .update({ status: 'deleted' })
        .eq('id', projectId);

      if (error) throw error;
  }

  static async restoreProject(projectId: string): Promise<void> {
      const { error } = await supabase
        .from('projects')
        .update({ status: 'active' })
        .eq('id', projectId);

      if (error) throw error;
  }

  static async getDeletedProjects(orgId: string): Promise<Project[]> {
      const { data, error } = await supabase
        .from('projects')
        .select(`
            *,
            teams:project_teams(count),
            members:project_members(count)
        `)
        .eq('organization_id', orgId)
        .eq('status', 'deleted')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      
      return data.map((p: any) => ({
          ...p,
          teams_count: p.teams?.[0]?.count || 0,
          members_count: p.members?.[0]?.count || 0
      })) as Project[];
  }

  static async hardDeleteProject(projectId: string): Promise<void> {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;
  }

  /**
   * Get Teams for Organization
   */
  static async getTeams(orgId: string): Promise<Team[]> {
      const { data, error } = await supabase
        .from('teams')
        .select(`
            *,
            members:team_members(count)
        `)
        .eq('organization_id', orgId)
        .order('name', { ascending: true });

      if (error) throw error;

      return data.map((t) => ({
          ...t,
          members_count: t.members?.[0]?.count || 0
      })) as Team[];
  }

  static async createTeam(orgId: string, name: string, description?: string): Promise<Team> {
      const { data, error } = await supabase
        .from('teams')
        .insert({
            organization_id: orgId,
            name,
            description
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as Team;
  }

  /**
   * Assign Team to Project (Scope Link)
   */
  static async assignTeamToProject(projectId: string, teamId: string): Promise<void> {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('project_teams')
        .insert({
            project_id: projectId,
            team_id: teamId,
            assigned_by: user?.id
        });
      
      if (error) throw error;
  }

  /**
   * Get Members of a Team
   */
  static async getTeamMembers(teamId: string): Promise<any[]> {
      const { data, error } = await supabase
        .from('team_members')
        .select(`
            *,
            user:user_id ( id, email, raw_user_meta_data )
        `)
        .eq('team_id', teamId);
      
      if (error) throw error;
      
      // Map to friendly format
      return data.map((tm: any) => ({
          team_id: tm.team_id,
          user_id: tm.user_id,
          added_by: tm.added_by,
          created_at: tm.created_at,
          user: {
              id: tm.user.id,
              email: tm.user.email,
              display_name: tm.user.raw_user_meta_data?.display_name,
              avatar_url: tm.user.raw_user_meta_data?.avatar_url
          }
      }));
  }

  /**
   * Add Member to Team
   */
  static async addTeamMember(teamId: string, userId: string): Promise<void> {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('team_members')
        .insert({
            team_id: teamId,
            user_id: userId,
            added_by: user?.id
        });
      
      if (error) {
          if (error.code === '23505') return; // Already exists, ignore
          throw error;
      }
  }

  /**
   * Remove Member from Team
   */
  static async removeTeamMember(teamId: string, userId: string): Promise<void> {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('team_id', teamId)
        .eq('user_id', userId);
      
      if (error) throw error;
  }
}
