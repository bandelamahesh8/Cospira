export type PermissionKey = 
  | 'ORG_VIEW'
  | 'ORG_UPDATE'
  | 'MEMBER_INVITE'
  | 'MEMBER_REMOVE'
  | 'ROLE_CREATE'
  | 'ROLE_ASSIGN'
  | 'PROJECT_CREATE'
  | 'PROJECT_DELETE'
  | 'TEAM_MANAGE'
  | 'BILLING_VIEW';

export interface Permission {
  id: string;
  key: PermissionKey;
  description: string;
}

export interface OrganizationRole {
  id: string;
  organization_id: string;
  name: string;
  is_system_role: boolean;
  priority: number; // 0=Owner, 100=Max
  is_deletable: boolean;
  is_editable: boolean;
  description?: string;
  permissions?: Permission[];
}

export interface OrganizationUser {
  id: string;
  user_id: string;
  organization_id: string;
  role_id: string;
  status: 'active' | 'invited' | 'blocked';
  joined_at: string;
  role?: {
      name: string;
  } | null;
  // UI Helpers
  role_name?: string;
  profiles?: {
      display_name: string | null;
      email?: string;
  } | null;
  user?: {
      id: string;
      email?: string;
      display_name?: string;
      avatar_url?: string;
  }
}

export interface OrganizationInvite {
    id: string;
    organization_id: string;
    email: string;
    role_id: string;
    token_hash?: string; // Stored hash
    expires_at: string;
    status: 'pending' | 'accepted' | 'expired' | 'revoked';
    role?: OrganizationRole;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  status: 'active' | 'suspended' | 'deleted';
  owner_id: string;
  created_at: string;
  updated_at?: string;
  role?: string; // Legacy
  current_user_role_id?: string;
  current_user_permissions?: PermissionKey[];
}

export interface Project {
    id: string;
    organization_id: string;
    name: string;
    description?: string;
    status: 'active' | 'archived' | 'deleted';
    created_at: string;
    updated_at?: string;
    created_by?: string;
    // Enriched fields
    teams_count?: number;
    members_count?: number;
}

export interface Team {
    id: string;
    organization_id: string;
    name: string;
    description?: string;
    created_at: string;
    // Enriched
    members_count?: number;
}

export interface TeamMember {
    team_id: string;
    user_id: string;
    added_by: string | null;
    created_at: string;
    user: {
        id: string;
        email?: string;
        display_name?: string;
        avatar_url?: string;
    };
}

export interface ActivityLog {
    id: string;
    organization_id: string;
    actor_id: string;
    action: string;
    target_type: string;
    target_id?: string;
    metadata?: Record<string, any>;
    created_at: string;
    actor?: {
        display_name?: string;
        email?: string;
    }
}
