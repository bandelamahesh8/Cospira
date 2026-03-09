import { OrgMode } from './organization';

// ─────────────────────────────────────────────────────────────
// Breakout Event Types
// All events emitted by either client or server over Socket.IO
// ─────────────────────────────────────────────────────────────

export type BreakoutEventType =
  | 'ORG_CREATED'
  | 'ORG_JOINED'
  | 'BREAKOUT_CREATED'
  | 'BREAKOUT_HOST_ASSIGNED'
  | 'PARTICIPANT_ASSIGNED'
  | 'BREAKOUT_LIVE'
  | 'USER_MOVED'
  | 'HOST_ENTERED'
  | 'HOST_LEFT'
  | 'BREAKOUT_CLOSED'
  | 'ORG_ENDED';

/**
 * Standard envelope for ALL breakout socket events.
 * Clients NEVER mutate state directly.
 * They request → server validates → server emits back.
 */
export interface BreakoutEventEnvelope<T = unknown> {
  event_id: string;
  org_id: string;
  user_id: string;
  event_type: BreakoutEventType;
  mode: OrgMode;
  timestamp: string;
  payload: T;
}

// ─────────────────────────────────────────────────────────────
// Typed Payloads
// ─────────────────────────────────────────────────────────────

export interface OrgCreatedPayload {
  organization_id: string;
  name: string;
  mode: OrgMode;
}

export interface OrgJoinedPayload {
  organization_id: string;
  user_id: string;
  location: 'LOBBY';
}

export interface BreakoutCreatedPayload {
  breakout_id: string;
  name: string;
  mode_override: OrgMode | null;
}

export interface BreakoutHostAssignedPayload {
  breakout_id: string;
  host_id: string;
}

export interface ParticipantAssignedPayload {
  breakout_id: string;
  user_id: string;
}

export interface BreakoutLivePayload {
  breakout_id: string;
  participant_ids: string[];
}

export interface UserMovedPayload {
  user_id: string;
  from: string; // 'LOBBY' | breakoutId
  to: string; // 'LOBBY' | breakoutId
}

export interface HostEnteredPayload {
  breakout_id: string;
  owner_id: string;
  silent: boolean; // false for ULTRA_SECURE
}

export interface HostLeftPayload {
  breakout_id: string;
  owner_id: string;
}

export interface BreakoutClosedPayload {
  breakout_id: string;
  reason?: string;
}

export interface OrgEndedPayload {
  organization_id: string;
}

// ─────────────────────────────────────────────────────────────
// Socket channel name helpers
// ─────────────────────────────────────────────────────────────

export const orgChannel = (orgId: string) => `org:${orgId}`;
export const breakoutChannel = (breakoutId: string) => `breakout:${breakoutId}`;
