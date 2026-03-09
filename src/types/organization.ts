// ─────────────────────────────────────────────────────────────
// Organization Mode & Status Enums
// ─────────────────────────────────────────────────────────────
export type OrgMode = 'FUN' | 'PROF' | 'ULTRA_SECURE' | 'MIXED';
export type OrgStatus = 'ACTIVE' | 'PAUSED' | 'ENDED';
export type BreakoutStatus = 'CREATED' | 'LIVE' | 'PAUSED' | 'CLOSED';
export type BreakoutRole = 'HOST' | 'PARTICIPANT';
export type UserLocation = 'LOBBY' | string; // string = breakoutId
export type RoomType = 'GENERAL' | 'SECURE_VAULT' | 'COLLAB_HUB' | 'AI_LAB' | 'ZERO_KNOWLEDGE';
export type SecurityLevel =
  | 'STANDARD'
  | 'MANDATORY_RECORDING'
  | 'ZERO_TRUST'
  | 'AI_OBSERVED'
  | 'QUANTUM_ENCRYPTED';
export type GlobalScenario = 'NORMAL' | 'CONFERENCE' | 'WORKSHOP' | 'DEBATE' | 'EMERGENCY';

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
  };
  onlineStatus?: string;
  joinedAt?: string;
  assignedBreakoutId?: string | null;
  // AI Smart Match V1: Mock skills for users
  skills?: string[];
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
  status: 'active' | 'suspended' | 'deleted' | 'paused' | 'ended';
  owner_id: string;
  created_at: string;
  updated_at?: string;
  // Policy-driven mode
  mode: OrgMode;
  role?: string; // Legacy
  current_user_role_id?: string;
  current_user_permissions?: PermissionKey[];
}

// ─────────────────────────────────────────────────────────────
// Breakout Session Types
// ─────────────────────────────────────────────────────────────
export interface BreakoutSession {
  id: string;
  organization_id: string;
  name: string;
  host_id: string | null;
  status: BreakoutStatus;
  max_participants: number;
  mode_override: OrgMode | null; // Only non-null when org.mode = MIXED
  room_type?: RoomType;
  security_level?: SecurityLevel;
  created_at: string;
  // Enriched fields
  participants?: BreakoutParticipant[];
  child_rooms?: BreakoutSession[];
  parent_breakout_id?: string | null;
  host?: { display_name: string; avatar_url?: string };
  participants_count?: number;

  // AI Smart Match V1: Room topics/tags
  tags?: string[];
}

export interface BreakoutParticipant {
  id: string;
  breakout_id: string;
  user_id: string;
  role: BreakoutRole;
  joined_at: string;
  parent_breakout_id?: string | null; // To easily trace back from a child room participant
  user?: {
    id: string;
    display_name?: string;
    email?: string;
    avatar_url?: string;
  };
}

// ─────────────────────────────────────────────────────────────
// User Presence (ephemeral — never stored in DB)
// ─────────────────────────────────────────────────────────────
export interface UserPresence {
  user_id: string;
  organization_id: string;
  location: UserLocation;
  display_name: string;
  avatar_url?: string;
  role?: string;
  // AI Smart Match V1: Mock skills for users
  skills?: string[];
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
  metadata?: Record<string, unknown>;
  created_at: string;
  actor?: {
    display_name?: string;
    email?: string;
  };
}

// ─────────────────────────────────────────────────────────────
// GAP 3: ULTRA Audit Pipeline — Immutable Audit Events
// ─────────────────────────────────────────────────────────────

/**
 * All actions that must be recorded in the immutable audit log.
 * POLICY_DENIED is always logged regardless of mode.
 * All others are logged when mode is ULTRA_SECURE.
 */
export type AuditAction =
  | 'BREAKOUT_CREATED'
  | 'BREAKOUT_STARTED'
  | 'BREAKOUT_PAUSED'
  | 'BREAKOUT_RESUMED'
  | 'BREAKOUT_CLOSED'
  | 'HOST_ASSIGNED'
  | 'PARTICIPANT_ASSIGNED'
  | 'PARTICIPANT_REMOVED'
  | 'HOST_REASSIGNED'
  | 'OWNER_JOINED'
  | 'MODE_SWITCHED'
  | 'POLICY_DENIED'; // Logged for ALL modes — tracks attempted violations

/**
 * Immutable audit event written exclusively by the server.
 * Client reads only. RLS: INSERT-only, no UPDATE, no DELETE.
 *
 * payload_hash = SHA-256 of JSON.stringify(payload) — tamper-evident.
 */
export interface AuditEvent {
  id: string;
  org_id: string;
  breakout_id?: string;
  actor_id: string;
  action: AuditAction;
  /**
   * SHA-256 hash of the payload JSON.
   * If payload_hash changes from what the server signed, the record was tampered with.
   */
  payload_hash: string;
  payload: Record<string, unknown>;
  /**
   * The effective org mode at time of the action.
   * Captured server-side to prevent retroactive mode-change disputes.
   */
  mode: OrgMode;
  /**
   * Audit code from BreakoutPolicyEngine (populated for POLICY_DENIED events).
   */
  audit_code?: string;
  created_at: string;
  /** Human-readable denial reason (POLICY_DENIED only) */
  denial_reason?: string;
}

// ─────────────────────────────────────────────────────────────
// AI Insight (advisory output — never mutates breakout state)
// ─────────────────────────────────────────────────────────────
export interface AIInsight {
  id: string;
  type: string;
  mode: string;
  content: Record<string, unknown>;
  confidence?: number;
  breakout_id?: string;
  created_at: string;
}
