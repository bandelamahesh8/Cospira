/**
 * Authority Engine — Cospira Advanced Neural Controls
 *
 * Manages a 5-level distributed authority hierarchy.
 * If the host disconnects, the system auto-promotes the highest-ranked co-host.
 *
 * Hierarchy (highest → lowest):
 *   HOST > COHOST > MODERATOR > SPEAKER > LISTENER
 */

import logger from '../../shared/logger.js';

// ─────────────────────────────────────────────
// ROLES & HIERARCHY
// ─────────────────────────────────────────────
export const AUTHORITY_ROLES = {
  HOST:       'HOST',
  COHOST:     'COHOST',
  MODERATOR:  'MODERATOR',
  SPEAKER:    'SPEAKER',
  LISTENER:   'LISTENER',
};

// Numeric weight: higher = more authority
const ROLE_WEIGHT = {
  HOST:      100,
  COHOST:     80,
  MODERATOR:  60,
  SPEAKER:    40,
  LISTENER:   20,
};

// ─────────────────────────────────────────────
// ACTION PERMISSION MAP
// Which roles can perform which actions
// ─────────────────────────────────────────────
const ACTION_PERMISSIONS = {
  // Room governance
  DISBAND_ROOM:         ['HOST'],
  LOCK_ROOM:            ['HOST', 'COHOST'],
  UNLOCK_ROOM:          ['HOST', 'COHOST'],
  STATE_CHANGE:         ['HOST', 'COHOST'],
  UPDATE_SETTINGS:      ['HOST', 'COHOST'],
  CREATE_POLICY:        ['HOST', 'COHOST'],
  DELETE_POLICY:        ['HOST', 'COHOST'],

  // Participant management
  KICK_USER:            ['HOST', 'COHOST', 'MODERATOR'],
  MUTE_USER:            ['HOST', 'COHOST', 'MODERATOR'],
  UNMUTE_USER:          ['HOST', 'COHOST', 'MODERATOR'],
  GRANT_SPEAKER:        ['HOST', 'COHOST', 'MODERATOR'],
  REVOKE_SPEAKER:       ['HOST', 'COHOST', 'MODERATOR'],
  APPROVE_LOBBY:        ['HOST', 'COHOST', 'MODERATOR'],
  GRANT_COHOST:         ['HOST'],
  REVOKE_COHOST:        ['HOST'],
  GRANT_MODERATOR:      ['HOST', 'COHOST'],
  REVOKE_MODERATOR:     ['HOST', 'COHOST'],
  PROMOTE_TO_HOST:      ['HOST'],

  // Content control
  SCREEN_SHARE_START:   ['HOST', 'COHOST', 'SPEAKER', 'MODERATOR'],
  STOP_SCREEN_SHARE:    ['HOST', 'COHOST', 'MODERATOR'],
  START_RECORDING:      ['HOST', 'COHOST'],
  STOP_RECORDING:       ['HOST', 'COHOST'],
  UPLOAD_FILE:          ['HOST', 'COHOST', 'SPEAKER', 'MODERATOR'],

  // Communication
  MIC_REQUEST:          ['HOST', 'COHOST', 'MODERATOR', 'SPEAKER', 'LISTENER'],
  CHAT_MESSAGE:         ['HOST', 'COHOST', 'MODERATOR', 'SPEAKER', 'LISTENER'],

  // Command network
  BROADCAST_TO_NETWORK: ['HOST', 'COHOST'],
  LOCK_NETWORK:         ['HOST'],
  INJECT_SPEAKER:       ['HOST', 'COHOST'],
};

// ─────────────────────────────────────────────
// AUTHORITY ENGINE CLASS
// ─────────────────────────────────────────────
class AuthorityEngine {
  /**
   * Get a user's authority role in a room.
   * Checks authorityRoles array first, then falls back to legacy role in members.
   * @param {object} room - Room document
   * @param {string} userId
   * @returns {string} role (one of AUTHORITY_ROLES)
   */
  getUserRole(room, userId) {
    // Check authorityRoles (new system)
    if (Array.isArray(room.authorityRoles)) {
      const entry = room.authorityRoles.find(r => r.userId === userId);
      if (entry) return entry.role;
    }

    // Fallback: check if user is the room host
    if (room.host === userId || room.createdBy === userId) return AUTHORITY_ROLES.HOST;

    // Fallback: check legacy coHosts array
    if (Array.isArray(room.coHosts) && room.coHosts.includes(userId)) return AUTHORITY_ROLES.COHOST;

    // Fallback: check members array role
    if (Array.isArray(room.members)) {
      const member = room.members.find(m => m.userId === userId);
      if (member) {
        return this._legacyRoleToAuthority(member.role);
      }
    }

    return AUTHORITY_ROLES.LISTENER;
  }

  /**
   * Check if a user can perform a specific action.
   * @param {object} room
   * @param {string} userId
   * @param {string} action  - one of ACTION_PERMISSIONS keys
   * @returns {{ allowed: boolean, role: string, reason: string }}
   */
  canPerformAction(room, userId, action) {
    const role = this.getUserRole(room, userId);
    const allowedRoles = ACTION_PERMISSIONS[action];

    if (!allowedRoles) {
      // Unknown action — allow by default (don't block)
      return { allowed: true, role, reason: 'Unknown action — permitted by default.' };
    }

    const allowed = allowedRoles.includes(role);

    return {
      allowed,
      role,
      reason: allowed
        ? `${role} is permitted to perform ${action}.`
        : `${role} is not permitted to perform ${action}. Requires: ${allowedRoles.join(', ')}.`,
    };
  }

  /**
   * Grant a role to a user in a room.
   * @param {object} room
   * @param {string} userId        - user to grant the role to
   * @param {string} newRole       - AUTHORITY_ROLES value
   * @param {string} grantedBy     - userId of the granter
   * @returns {{ success: boolean, role: string }}
   */
  async grantRole(room, userId, newRole, grantedBy) {
    if (!Object.values(AUTHORITY_ROLES).includes(newRole)) {
      throw new Error(`Invalid role: ${newRole}`);
    }

    // Only HOST can grant HOST, must have sufficient authority
    const granterRole = this.getUserRole(room, grantedBy);
    const granterWeight = ROLE_WEIGHT[granterRole] ?? 0;
    const targetWeight = ROLE_WEIGHT[newRole] ?? 0;

    if (granterWeight <= targetWeight && newRole !== AUTHORITY_ROLES.LISTENER) {
      throw new Error(`Cannot grant ${newRole} — granter role (${granterRole}) has insufficient authority.`);
    }

    // Initialise authorityRoles if missing
    if (!Array.isArray(room.authorityRoles)) {
      room.authorityRoles = [];
    }

    const existing = room.authorityRoles.find(r => r.userId === userId);
    if (existing) {
      existing.role = newRole;
      existing.grantedBy = grantedBy;
      existing.grantedAt = new Date();
    } else {
      room.authorityRoles.push({ userId, role: newRole, grantedBy, grantedAt: new Date() });
    }

    // If promoting to HOST, update room.host field and demote old host to COHOST
    if (newRole === AUTHORITY_ROLES.HOST) {
      const oldHostEntry = room.authorityRoles.find(r => r.userId === room.host && r.userId !== userId);
      if (oldHostEntry) oldHostEntry.role = AUTHORITY_ROLES.COHOST;
      room.host = userId;
    }

    await room.save();
    logger.info(`[AuthorityEngine] ${userId} granted ${newRole} in room ${room.roomId} by ${grantedBy}`);

    return { success: true, role: newRole, userId };
  }

  /**
   * Revoke a user's explicit role (reverts to LISTENER).
   * @param {object} room
   * @param {string} userId
   * @param {string} revokedBy
   */
  async revokeRole(room, userId, revokedBy) {
    if (!Array.isArray(room.authorityRoles)) return;

    room.authorityRoles = room.authorityRoles.filter(r => r.userId !== userId);
    await room.save();

    logger.info(`[AuthorityEngine] Role revoked for ${userId} in room ${room.roomId} by ${revokedBy}`);
  }

  /**
   * Auto-promote the highest-ranked remaining user when the host leaves.
   * @param {object} room
   * @param {string} leftUserId  - userId of user who left
   * @param {Function} broadcast - fn(roomId, event, data) for socket broadcast
   * @returns {{ promoted: boolean, newHostId?: string }}
   */
  async autoPromoteOnHostLeave(room, leftUserId, broadcast) {
    if (room.host !== leftUserId) return { promoted: false };

    logger.info(`[AuthorityEngine] Host ${leftUserId} left room ${room.roomId} — auto-promoting.`);

    if (!Array.isArray(room.authorityRoles)) {
      return { promoted: false, reason: 'No authority roles defined.' };
    }

    // Find highest-weight remaining role (excluding the one who left)
    const candidates = room.authorityRoles
      .filter(r => r.userId !== leftUserId)
      .sort((a, b) => (ROLE_WEIGHT[b.role] ?? 0) - (ROLE_WEIGHT[a.role] ?? 0));

    if (candidates.length === 0) {
      // Fallback: promote first member
      const firstMember = room.members?.find(m => m.userId !== leftUserId);
      if (firstMember) {
        candidates.push({ userId: firstMember.userId, role: AUTHORITY_ROLES.LISTENER });
      }
    }

    if (candidates.length === 0) {
      return { promoted: false, reason: 'No candidates for promotion.' };
    }

    const newHost = candidates[0];
    await this.grantRole(room, newHost.userId, AUTHORITY_ROLES.HOST, 'system');

    broadcast?.(room.roomId, 'authority:host_promoted', {
      newHostId:    newHost.userId,
      previousHost: leftUserId,
      reason:       'Host disconnected — auto-promoted.',
    });

    return { promoted: true, newHostId: newHost.userId };
  }

  /**
   * Get authority roster for a room — all users with their roles.
   * @param {object} room
   * @returns {Array<{ userId, role, grantedBy, grantedAt }>}
   */
  getAuthorityRoster(room) {
    const roster = [];

    // Add host
    roster.push({ userId: room.host, role: AUTHORITY_ROLES.HOST, grantedBy: 'system', grantedAt: room.createdAt });

    // Add authorityRoles entries (not host — already added)
    if (Array.isArray(room.authorityRoles)) {
      for (const entry of room.authorityRoles) {
        if (entry.userId !== room.host) {
          roster.push(entry);
        }
      }
    }

    // Add LISTENER for all members not in roster
    if (Array.isArray(room.members)) {
      for (const member of room.members) {
        const inRoster = roster.find(r => r.userId === member.userId);
        if (!inRoster) {
          roster.push({ userId: member.userId, role: AUTHORITY_ROLES.LISTENER, grantedBy: 'default' });
        }
      }
    }

    return roster;
  }

  /**
   * Get all actions allowed for a specific role.
   * @param {string} role
   * @returns {Array<string>}
   */
  getActionPermissions(role) {
    return Object.entries(ACTION_PERMISSIONS)
      .filter(([, roles]) => roles.includes(role))
      .map(([action]) => action);
  }

  /**
   * Check if userA has authority over userB (higher role weight).
   * @param {object} room
   * @param {string} actorId
   * @param {string} targetId
   * @returns {boolean}
   */
  hasAuthorityOver(room, actorId, targetId) {
    const actorRole  = this.getUserRole(room, actorId);
    const targetRole = this.getUserRole(room, targetId);
    return (ROLE_WEIGHT[actorRole] ?? 0) > (ROLE_WEIGHT[targetRole] ?? 0);
  }

  // ─── Helpers ──────────────────────────────

  _legacyRoleToAuthority(legacyRole) {
    const map = {
      host:   AUTHORITY_ROLES.HOST,
      member: AUTHORITY_ROLES.LISTENER,
      guest:  AUTHORITY_ROLES.LISTENER,
    };
    return map[legacyRole] ?? AUTHORITY_ROLES.LISTENER;
  }
}

export default new AuthorityEngine();
