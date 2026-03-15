/**
 * Permission Engine - Centralized Security & Policy Enforcement
 * 
 * Enforces room-level, org-level, and role-based access control.
 */

import logger from '../logger.js';

class PermissionEngine {
    /**
     * Checks if a user can join a room.
     * @param {object} room - Room object with settings and members
     * @param {object} user - User object (from socket or session)
     * @param {string} inviteToken - Optional invite token
     * @param {string} joinCode - Optional join code
     * @returns {object} { allowed: boolean, reason: string, status: string }
     */
    canJoin(room, user, inviteToken = null, joinCode = null) {
        if (!room) return { allowed: false, reason: 'Room not found', status: 'NOT_FOUND' };
        if (!user) return { allowed: false, reason: 'Authentication required', status: 'UNAUTHENTICATED' };

        const settings = room.settings || {};
        const isOwner = room.hostId === user.id || room.host === user.id || room.createdBy === user.id || user.isSuperHost;
        const isMember = Array.isArray(room.users) ? room.users.some(u => u.id === user.id) : (room.users && (room.users[user.id] || Object.values(room.users).some(u => u.id === user.id)));

        const isApproved = room.approvedUsers && room.approvedUsers[user.id];

        // Owners and existing members are always allowed
        // Wait, if required_reapproval is ON, do we let existing members re-join?
        // Typically existing members shouldn't need re-approval, only those who were "approved" but left.
        // But the prompt says "if user leave the session want to join again need to ask permission or not".
        // If they are an existing member (room.users), they are actively in the session, they don't need to re-join.
        // If they already exist in approvedUsers, we can bypass lobby IF require_reapproval_on_rejoin is false.
        
        if (isOwner || isMember) {
            return { allowed: true };
        }
        
        if (isApproved && !settings.require_reapproval_on_rejoin) {
            return { allowed: true };
        }

        // 1. Organization Check
        if (settings.organization_only && room.orgId) {
            if (user.orgId !== room.orgId) {
                return { allowed: false, reason: 'This room is restricted to organization members.', status: 'ORG_RESTRICTED' };
            }
        }

        // 2. Invite-Only Check
        if (settings.invite_only) {
            if (inviteToken && room.inviteToken === inviteToken) {
                // Token valid, proceed to lobby check
            } else {
                return { allowed: false, reason: 'This room is invite-only.', status: 'INVITE_ONLY' };
            }
        }

        // 3. Join by Code Check
        if (settings.join_by_code && !settings.invite_only) {
            if (joinCode && room.joinCode !== joinCode) {
                return { allowed: false, reason: 'Invalid room code.', status: 'INVALID_CODE' };
            }
        }

        // 4. Waiting Lobby Check
        const lobbyEnabled = room.hasWaitingRoom || settings.waiting_lobby || settings.waitingRoom;
        const autoApprove = settings.autoApprove === true;

        if (lobbyEnabled && !autoApprove && !isOwner && !isMember) {
            // Check if user is already approved in lobby (this logic would be in socket handler)
            return { allowed: true, status: 'WAITING_LOBBY', reason: 'Waiting for host approval.' };
        }


        return { allowed: true };
    }

    /**
     * Checks if a user has permission to speak.
     * @param {object} room - Room object
     * @param {string} userId - User ID
     * @returns {boolean}
     */
    canSpeak(room, userId, userContext = {}) {
        if (!room) return false;
        const settings = room.settings || {};
        
        if (!settings.host_controlled_speaking) return true;

        const isOwner = room.hostId === userId || room.host === userId || room.createdBy === userId;
        const isCoHost = Array.isArray(room.coHosts) && room.coHosts.includes(userId);
        // Super Host (org owner) can always speak
        const isSuperHost = userContext.isSuperHost === true;

        if (isOwner || isCoHost || isSuperHost) return true;

        // Check explicit speaker list (this would be in room state)
        if (room.speakers && room.speakers[userId]) {
            return room.speakers[userId].allowed;
        }

        return false;
    }

    /**
     * Checks if a user can manage room settings.
     * @param {object} room - Room object
     * @param {string} userId - User ID
     * @returns {boolean}
     */
    canManageSettings(room, userId, userContext = {}) {
        if (!room) return false;
        // Super Host (org owner) can always manage settings across all rooms
        if (userContext.isSuperHost === true) return true;
        return room.hostId === userId || room.host === userId || (Array.isArray(room.coHosts) && room.coHosts.includes(userId));
    }
}

export default new PermissionEngine();
