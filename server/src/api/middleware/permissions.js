/**
 * Permission System for Cospira Rooms
 * 
 * Defines role-based permissions and provides middleware for checking permissions.
 */

// Permission definitions by role
export const PERMISSIONS = {
  host: [
    // User management
    'kick_user',
    'promote_user',
    'demote_user',
    
    // Room control
    'mute_all',
    'unmute_all',
    'lock_room',
    'unlock_room',
    'end_room',
    'change_settings',
    'delete_room',
    
    // Content moderation
    'delete_message',
    'delete_any_action',
    'delete_any_decision',
    
    // Features
    'create_poll',
    'close_poll',
    'force_end_poll',
    
    // All member permissions
    'speak',
    'chat',
    'share_screen',
    'share_audio',
    'create_action',
    'update_own_action',
    'create_decision',
    'update_own_decision',
    'vote_poll',
    'react',
    'use_virtual_browser'
  ],
  
  member: [
    // Communication
    'speak',
    'chat',
    'react',
    
    // Sharing
    'share_screen',
    'share_audio',
    
    // Collaboration
    'create_action',
    'update_own_action',
    'complete_own_action',
    'create_decision',
    'update_own_decision',
    'vote_poll',
    
    // Features
    'use_virtual_browser',
    'request_speak' // For moderated rooms
  ],
  
  guest: [
    // Limited communication
    'speak',        // Can be disabled in room settings
    'chat',         // Can be disabled in room settings
    'react',
    
    // View only
    'view_content',
    'vote_poll'     // Can participate in polls
  ]
};

/**
 * Check if a role has a specific permission
 * @param {string} role - User role (host, member, guest)
 * @param {string} permission - Permission to check
 * @returns {boolean}
 */
export function hasPermission(role, permission) {
  if (!role || !permission) return false;
  return PERMISSIONS[role]?.includes(permission) || false;
}

/**
 * Check if a user can perform an action on a resource they own
 * @param {string} role - User role
 * @param {string} permission - Permission to check
 * @param {string} resourceOwnerId - Owner of the resource
 * @param {string} userId - Current user ID
 * @returns {boolean}
 */
export function canModifyOwnResource(role, permission, resourceOwnerId, userId) {
  // Host can modify anything
  if (role === 'host') return true;
  
  // Check if permission is for "own" resources
  if (permission.includes('own') && resourceOwnerId === userId) {
    return hasPermission(role, permission);
  }
  
  return false;
}

/**
 * Get all permissions for a role
 * @param {string} role - User role
 * @returns {string[]}
 */
export function getRolePermissions(role) {
  return PERMISSIONS[role] || [];
}

/**
 * Check if user can perform action based on room settings
 * @param {string} role - User role
 * @param {string} permission - Permission to check
 * @param {object} roomSettings - Room settings object
 * @returns {boolean}
 */
export function checkPermissionWithSettings(role, permission, roomSettings = {}) {
  // First check if role has base permission
  if (!hasPermission(role, permission)) {
    return false;
  }
  
  // Apply room-specific restrictions for guests
  if (role === 'guest') {
    if (permission === 'speak' && roomSettings.guestCanSpeak === false) {
      return false;
    }
    if (permission === 'chat' && roomSettings.guestCanChat === false) {
      return false;
    }
  }
  
  return true;
}

/**
 * Middleware factory for socket event permission checking
 * @param {string} requiredPermission - Permission required for this action
 * @param {function} getRoomFn - Function to get room from socket data
 * @returns {function} Middleware function
 */
export function requirePermission(requiredPermission, getRoomFn) {
  return async (socket, data, next) => {
    try {
      const room = await getRoomFn(data);
      
      if (!room) {
        return next(new Error('Room not found'));
      }
      
      const userId = socket.userId || socket.user?.id;
      if (!userId) {
        return next(new Error('User not authenticated'));
      }
      
      const userRole = room.getMemberRole(userId);
      
      if (!userRole) {
        return next(new Error('User is not a member of this room'));
      }
      
      const hasAccess = checkPermissionWithSettings(
        userRole,
        requiredPermission,
        room.settings
      );
      
      if (!hasAccess) {
        return next(new Error(`Permission denied: ${requiredPermission}`));
      }
      
      // Attach role to socket for use in handler
      socket.userRole = userRole;
      socket.roomData = room;
      
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Simple permission check for use in socket handlers
 * @param {object} room - Room object
 * @param {string} userId - User ID
 * @param {string} permission - Permission to check
 * @returns {boolean}
 */
export function checkUserPermission(room, userId, permission) {
  const userRole = room.getMemberRole(userId);
  if (!userRole) return false;
  
  return checkPermissionWithSettings(userRole, permission, room.settings);
}

/**
 * Permission error response helper
 * @param {string} permission - Permission that was denied
 * @returns {object} Error object
 */
export function permissionDeniedError(permission) {
  return {
    error: 'PERMISSION_DENIED',
    message: `You don't have permission to: ${permission}`,
    permission
  };
}

/**
 * Check if user is host
 * @param {object} room - Room object
 * @param {string} userId - User ID
 * @returns {boolean}
 */
export function isHost(room, userId) {
  return room.isHost(userId);
}

/**
 * Check if user is at least a member (not a guest)
 * @param {object} room - Room object
 * @param {string} userId - User ID
 * @returns {boolean}
 */
export function isMemberOrAbove(room, userId) {
  const role = room.getMemberRole(userId);
  return role === 'host' || role === 'member';
}

export default {
  PERMISSIONS,
  hasPermission,
  canModifyOwnResource,
  getRolePermissions,
  checkPermissionWithSettings,
  requirePermission,
  checkUserPermission,
  permissionDeniedError,
  isHost,
  isMemberOrAbove
};
