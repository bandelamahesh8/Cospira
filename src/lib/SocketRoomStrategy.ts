/**
 * Socket Room Strategy
 * ─────────────────────────────────────────────────────────────
 * Defines the canonical room naming convention, event names,
 * and scaling strategy for all breakout socket communications.
 *
 * This file is the single source of truth for room names and
 * event identifiers. Both client and server must import from here
 * (or a server copy) to prevent typo-driven bugs.
 *
 * FANOUT STRATEGY:
 *   org:{id}           → All members of an organization
 *   org:{id}:owner     → Org owner only (private notifications)
 *   breakout:{id}      → Participants in a specific breakout session
 *   lobby:{orgId}      → Users currently in the org lobby
 *
 * SCALING:
 *   Use socket.io-redis adapter for horizontal scaling (multi-node).
 *   Redis pub/sub channel per room: matches room naming above.
 *   Presence stored in Redis hash with 30s TTL, refreshed by heartbeat.
 *
 * CAPACITY LIMITS:
 *   Max 500 users per org room (WebSocket broadcast limit)
 *   Max 50 users per breakout room (enforced by max_participants)
 *   Owner private room: exactly 1 socket (the owner's session)
 */

// ─────────────────────────────────────────────────────────────
// Room name builders
// ─────────────────────────────────────────────────────────────

export const SOCKET_ROOMS = {
  /** All members of an organization — broadcast org-level events here */
  org: (orgId: string) => `org:${orgId}`,

  /** Org owner private channel — host disconnect alerts, policy denials */
  orgOwner: (orgId: string) => `org:${orgId}:owner`,

  /** Everyone in a specific breakout session */
  breakout: (breakoutId: string) => `breakout:${breakoutId}`,

  /** Users in the org lobby (not currently in any breakout) */
  lobby: (orgId: string) => `lobby:${orgId}`,
} as const;

// ─────────────────────────────────────────────────────────────
// Canonical event names (client ↔ server)
// ─────────────────────────────────────────────────────────────

export const SOCKET_EVENTS = {
  // ── Client → Server (emit) ──────────────────────────────
  /** Owner requests a breakout to start */
  BREAKOUT_START_REQ: 'breakout:start',
  /** Owner requests a breakout to close */
  BREAKOUT_CLOSE_REQ: 'breakout:close',
  /** Owner requests a breakout to pause */
  BREAKOUT_PAUSE_REQ: 'breakout:pause',
  /** Owner requests a paused breakout to resume */
  BREAKOUT_RESUME_REQ: 'breakout:resume',
  /** Owner assigns a host to a breakout */
  HOST_ASSIGN_REQ: 'breakout:assign-host',
  /** Owner assigns a participant to a breakout */
  PARTICIPANT_ASSIGN_REQ: 'breakout:assign-participant',
  /** Host removes participant to lobby */
  PARTICIPANT_REMOVE_REQ: 'breakout:remove-participant',
  /** Host requests to reassign a participant within breakout */
  HOST_REASSIGN_REQ: 'breakout:host-reassign',
  /** Participant requests to self-move */
  PARTICIPANT_MOVE_REQ: 'breakout:participant-move',
  /** Owner requests org mode switch */
  MODE_SWITCH_REQ: 'org:mode-switch',
  /** Heartbeat to keep presence alive */
  PRESENCE_HEARTBEAT: 'presence:heartbeat',

  // ── Server → Client (on) ────────────────────────────────
  /** Server broadcasts canonical breakout state update */
  BREAKOUT_STATE_UPDATED: 'breakout:state-updated',
  /** Server confirms a breakout went LIVE */
  BREAKOUT_STARTED: 'breakout:started',
  /** Server confirms a breakout was paused */
  BREAKOUT_PAUSED: 'breakout:paused',
  /** Server confirms a breakout was resumed */
  BREAKOUT_RESUMED: 'breakout:resumed',
  /** Server confirms a breakout is closed */
  BREAKOUT_CLOSED: 'breakout:closed',
  /** Server confirms a new breakout was created */
  BREAKOUT_CREATED: 'breakout:created',
  /** Server notifies org mode changed */
  ORG_MODE_CHANGED: 'org:mode-changed',
  /** Server broadcasts participant list update */
  PARTICIPANT_LIST_UPDATED: 'breakout:participant-list',
  /** Server → owner: host disconnected from their breakout */
  HOST_DISCONNECTED_ALERT: 'breakout:host-disconnected',
  /** Server → owner: host still absent after grace period */
  HOST_ABSENT_WARNING: 'breakout:host-absent-warning',
  /** Server rejects an action due to policy */
  POLICY_DENIED: 'policy:denied',
  /** Generic org-level error */
  ORG_ERROR: 'org:error',
  /** Generic breakout-level error */
  BREAKOUT_ERROR: 'breakout:error',
} as const;

// ─────────────────────────────────────────────────────────────
// Policy denial payload (emitted on POLICY_DENIED)
// ─────────────────────────────────────────────────────────────

export interface PolicyDeniedPayload {
  action: string;
  auditCode: string;
  reason: string;
  /** If true, this denial was logged to the immutable audit table */
  wasAudited: boolean;
}

// ─────────────────────────────────────────────────────────────
// Presence heartbeat config
// ─────────────────────────────────────────────────────────────

export const PRESENCE_CONFIG = {
  /** Client sends heartbeat every N ms */
  HEARTBEAT_INTERVAL_MS: 10_000,
  /** Server expires presence entry after N ms of no heartbeat */
  PRESENCE_TTL_MS: 30_000,
  /** Redis key pattern for presence */
  redisPresenceKey: (orgId: string) => `presence:${orgId}`,
} as const;

// ─────────────────────────────────────────────────────────────
// Capacity limits
// ─────────────────────────────────────────────────────────────

export const CAPACITY_LIMITS = {
  /** Max users in an org socket room before load-shedding */
  MAX_ORG_ROOM_USERS: 500,
  /** Max participants per breakout (also enforced by DB constraint) */
  MAX_BREAKOUT_PARTICIPANTS: 50,
  /** Default max if not specified at breakout creation */
  DEFAULT_MAX_PARTICIPANTS: 20,
} as const;
