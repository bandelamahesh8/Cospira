/**
 * Room Service - Manages persistent rooms using MongoDB
 * 
 * This service provides a layer between socket handlers and the database,
 * managing both MongoDB (persistent) and Redis (in-memory) storage.
 */

import { Room } from '../models/Room.js';
import { Session } from '../models/Session.js';
import logger from '../logger.js';
import { v4 as uuidv4 } from 'uuid';

class RoomService {
  /**
   * Create a new room
   * @param {object} roomData - Room creation data
   * @returns {Promise<object>} Created room
   */
  async createRoom(roomData) {
    try {
      const {
        roomId,
        name: roomName,
        createdBy,
        purpose = 'general',
        accessType = 'public',
        passwordHash = null,
        settings = {}
      } = roomData;

      // Check if room already exists
      const existingRoom = await Room.findByRoomId(roomId);
      if (existingRoom && existingRoom.isActive) {
        throw new Error('Room already exists and is active');
      }

      // Create room document
      const room = new Room({
        roomId,
        name: roomName,
        createdBy,
        host: createdBy,
        purpose,
        accessType,
        passwordHash,
        settings: {
          allowGuests: settings.allowGuests !== false,
          requireApproval: settings.requireApproval || false,
          maxParticipants: settings.maxParticipants || 50,
          recordSessions: settings.recordSessions || false,
          invite_only: settings.invite_only || false,
          join_by_link: settings.join_by_link !== false,
          join_by_code: settings.join_by_code !== false,
          host_only_code_visibility: settings.host_only_code_visibility || false,
          waiting_lobby: settings.waiting_lobby || false,
          organization_only: settings.organization_only || false,
          host_controlled_speaking: settings.host_controlled_speaking || false,
          chat_permission: settings.chat_permission || 'everyone',
          encryption_enabled: settings.encryption_enabled || false,
          ai_moderation_level: settings.ai_moderation_level || 'off',
          auto_close_minutes: settings.auto_close_minutes || 0,
          hidden_room: settings.hidden_room || false
        },
        members: [{
          userId: createdBy,
          role: 'host',
          joinedAt: new Date(),
          lastSeenAt: new Date()
        }],
        isActive: true,
        lastActiveAt: new Date()
      });

      await room.save();
      
      logger.info(`[RoomService] Room created: ${roomId} by ${createdBy}`);
      
      return room;
    } catch (error) {
      logger.error('[RoomService] Failed to create room', {
        error: error.message,
        roomData
      });
      throw error;
    }
  }

  /**
   * Get room by roomId
   * @param {string} roomId - Room ID
   * @returns {Promise<object|null>} Room document
   */
  async getRoom(roomId) {
    try {
      return await Room.findByRoomId(roomId);
    } catch (error) {
      logger.error('[RoomService] Failed to get room', {
        roomId,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Add user to room
   * @param {string} roomId - Room ID
   * @param {string} userId - User ID
   * @param {string} role - User role (host, member, guest)
   * @returns {Promise<object>} Updated room
   */
  async addUserToRoom(roomId, userId, role = 'member') {
    try {
      const room = await Room.findByRoomId(roomId);
      if (!room) {
        throw new Error('Room not found');
      }

      room.addMember(userId, role);
      room.lastActiveAt = new Date();
      await room.save();

      logger.info(`[RoomService] User ${userId} added to room ${roomId} as ${role}`);
      
      return room;
    } catch (error) {
      logger.error('[RoomService] Failed to add user to room', {
        roomId,
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Remove user from room
   * @param {string} roomId - Room ID
   * @param {string} userId - User ID
   * @returns {Promise<object>} Updated room
   */
  async removeUserFromRoom(roomId, userId) {
    try {
      const room = await Room.findByRoomId(roomId);
      if (!room) {
        throw new Error('Room not found');
      }

      room.removeMember(userId);
      room.lastActiveAt = new Date();
      
      // If room is empty, mark as inactive
      if (room.members.length === 0) {
        room.isActive = false;
      }
      
      await room.save();

      logger.info(`[RoomService] User ${userId} removed from room ${roomId}`);
      
      return room;
    } catch (error) {
      logger.error('[RoomService] Failed to remove user from room', {
        roomId,
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Update user's last seen time
   * @param {string} roomId - Room ID
   * @param {string} userId - User ID
   * @returns {Promise<object>} Updated room
   */
  async updateUserLastSeen(roomId, userId) {
    try {
      const room = await Room.findByRoomId(roomId);
      if (!room) {
        return null;
      }

      room.updateMemberLastSeen(userId);
      await room.save();

      return room;
    } catch (error) {
      logger.error('[RoomService] Failed to update last seen', {
        roomId,
        userId,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Update room settings
   * @param {string} roomId - Room ID
   * @param {string} userId - User ID (must be host)
   * @param {object} settings - Settings to update
   * @returns {Promise<object>} Updated room
   */
  async updateRoomSettings(roomId, userId, settings) {
    try {
      const room = await Room.findByRoomId(roomId);
      if (!room) {
        throw new Error('Room not found');
      }

      if (!room.isHost(userId)) {
        throw new Error('Only host can update room settings');
      }

      // Update settings
      if (settings.name !== undefined) {
        room.name = settings.name;
      }
      if (settings.purpose !== undefined) {
        room.purpose = settings.purpose;
      }
      if (settings.allowGuests !== undefined) {
        room.settings.allowGuests = settings.allowGuests;
      }
      if (settings.requireApproval !== undefined) {
        room.settings.requireApproval = settings.requireApproval;
      }
      if (settings.maxParticipants !== undefined) {
        room.settings.maxParticipants = settings.maxParticipants;
      }
      if (settings.recordSessions !== undefined) {
        room.settings.recordSessions = settings.recordSessions;
      }
      if (settings.invite_only !== undefined) {
        room.settings.invite_only = settings.invite_only;
      }
      if (settings.join_by_link !== undefined) {
        room.settings.join_by_link = settings.join_by_link;
      }
      if (settings.join_by_code !== undefined) {
        room.settings.join_by_code = settings.join_by_code;
      }
      if (settings.host_only_code_visibility !== undefined) {
        room.settings.host_only_code_visibility = settings.host_only_code_visibility;
      }
      if (settings.waiting_lobby !== undefined) {
        room.settings.waiting_lobby = settings.waiting_lobby;
      }
      if (settings.organization_only !== undefined) {
        room.settings.organization_only = settings.organization_only;
      }
      if (settings.host_controlled_speaking !== undefined) {
        room.settings.host_controlled_speaking = settings.host_controlled_speaking;
      }
      if (settings.chat_permission !== undefined) {
        room.settings.chat_permission = settings.chat_permission;
      }
      if (settings.encryption_enabled !== undefined) {
        room.settings.encryption_enabled = settings.encryption_enabled;
      }
      if (settings.ai_moderation_level !== undefined) {
        room.settings.ai_moderation_level = settings.ai_moderation_level;
      }
      if (settings.auto_close_minutes !== undefined) {
        room.settings.auto_close_minutes = settings.auto_close_minutes;
      }
      if (settings.hidden_room !== undefined) {
        room.settings.hidden_room = settings.hidden_room;
      }

      await room.save();

      logger.info(`[RoomService] Room settings updated for ${roomId}`);
      
      return room;
    } catch (error) {
      logger.error('[RoomService] Failed to update room settings', {
        roomId,
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Promote user to host
   * @param {string} roomId - Room ID
   * @param {string} currentHostId - Current host user ID
   * @param {string} newHostId - New host user ID
   * @returns {Promise<object>} Updated room
   */
  async promoteToHost(roomId, currentHostId, newHostId) {
    try {
      const room = await Room.findByRoomId(roomId);
      if (!room) {
        throw new Error('Room not found');
      }

      if (!room.isHost(currentHostId)) {
        throw new Error('Only current host can promote new host');
      }

      room.promoteToHost(newHostId);
      await room.save();

      logger.info(`[RoomService] User ${newHostId} promoted to host in room ${roomId}`);
      
      return room;
    } catch (error) {
      logger.error('[RoomService] Failed to promote to host', {
        roomId,
        currentHostId,
        newHostId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get user's role in room
   * @param {string} roomId - Room ID
   * @param {string} userId - User ID
   * @returns {Promise<string|null>} User role or null
   */
  async getUserRole(roomId, userId) {
    try {
      const room = await Room.findByRoomId(roomId);
      if (!room) {
        return null;
      }

      return room.getMemberRole(userId);
    } catch (error) {
      logger.error('[RoomService] Failed to get user role', {
        roomId,
        userId,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Get all rooms for a user
   * @param {string} userId - User ID
   * @param {boolean} activeOnly - Only return active rooms
   * @returns {Promise<Array>} Array of rooms
   */
  async getUserRooms(userId, activeOnly = true) {
    try {
      return await Room.findUserRooms(userId, activeOnly);
    } catch (error) {
      logger.error('[RoomService] Failed to get user rooms', {
        userId,
        error: error.message
      });
      return [];
    }
  }

  /**
   * Get all active rooms
   * @returns {Promise<Array>} Array of active rooms
   */
  async getActiveRooms() {
    try {
      return await Room.findActiveRooms();
    } catch (error) {
      logger.error('[RoomService] Failed to get active rooms', {
        error: error.message
      });
      return [];
    }
  }

  /**
   * Archive room (soft delete)
   * @param {string} roomId - Room ID
   * @param {string} userId - User ID (must be host)
   * @returns {Promise<object>} Archived room
   */
  async archiveRoom(roomId, userId) {
    try {
      const room = await Room.findByRoomId(roomId);
      if (!room) {
        throw new Error('Room not found');
      }

      if (!room.isHost(userId)) {
        throw new Error('Only host can archive room');
      }

      room.isActive = false;
      await room.save();

      logger.info(`[RoomService] Room ${roomId} archived by ${userId}`);
      
      return room;
    } catch (error) {
      logger.error('[RoomService] Failed to archive room', {
        roomId,
        userId,
        error: error.message
      });
      throw error;
    }
  }

  // ===== SESSION MANAGEMENT =====

  /**
   * Start a new session for a room
   * @param {string} roomId - Room ID
   * @param {string} userId - User ID who started the session
   * @param {string} userName - User name
   * @returns {Promise<object>} Created session
   */
  async startSession(roomId, userId, userName) {
    try {
      // Check if there's already an active session
      const activeSession = await Session.findActiveByRoom(roomId);
      if (activeSession) {
        // Add participant to existing session
        activeSession.addParticipant(userId, userName);
        await activeSession.save();
        return activeSession;
      }

      // Get room to determine purpose
      const room = await Room.findByRoomId(roomId);
      
      // Create new session
      const session = new Session({
        sessionId: uuidv4(),
        roomId,
        startedAt: new Date(),
        purpose: room?.purpose || 'general',
        participants: [{
          userId,
          userName,
          joinedAt: new Date()
        }],
        peakParticipants: 1,
        isActive: true
      });

      await session.save();

      logger.info(`[RoomService] Session started for room ${roomId}`, {
        sessionId: session.sessionId
      });
      
      return session;
    } catch (error) {
      logger.error('[RoomService] Failed to start session', {
        roomId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Add participant to session
   * @param {string} roomId - Room ID
   * @param {string} userId - User ID
   * @param {string} userName - User name
   * @returns {Promise<object|null>} Updated session
   */
  async addParticipantToSession(roomId, userId, userName) {
    try {
      const session = await Session.findActiveByRoom(roomId);
      if (!session) {
        // No active session, start one
        return await this.startSession(roomId, userId, userName);
      }

      session.addParticipant(userId, userName);
      await session.save();

      return session;
    } catch (error) {
      logger.error('[RoomService] Failed to add participant to session', {
        roomId,
        userId,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Remove participant from session
   * @param {string} roomId - Room ID
   * @param {string} userId - User ID
   * @returns {Promise<object|null>} Updated session
   */
  async removeParticipantFromSession(roomId, userId) {
    try {
      const session = await Session.findActiveByRoom(roomId);
      if (!session) {
        return null;
      }

      session.removeParticipant(userId);
      
      // If no more active participants, end session
      if (session.getActiveParticipantCount() === 0) {
        session.endSession('auto');
        
        // Update room statistics
        await this.updateRoomStats(roomId, session);
      }

      await session.save();

      return session;
    } catch (error) {
      logger.error('[RoomService] Failed to remove participant from session', {
        roomId,
        userId,
        error: error.message
      });
      return null;
    }
  }

  /**
   * End session
   * @param {string} roomId - Room ID
   * @param {string} endedBy - User ID who ended the session
   * @returns {Promise<object|null>} Ended session
   */
  async endSession(roomId, endedBy = 'auto') {
    try {
      const session = await Session.findActiveByRoom(roomId);
      if (!session) {
        return null;
      }

      session.endSession(endedBy);
      await session.save();

      // Update room statistics
      await this.updateRoomStats(roomId, session);

      // AUTO-GENERATE SUMMARY (Phase 1: Outcome Engine)
      // Only generate if session had meaningful duration (> 2 minutes)
      if (session.totalDuration >= 2) {
        try {
          // Dynamic import to avoid circular dependency
          const { default: meetingSummarizerService } = await import('./MeetingSummarizerService.js');
          
          // Generate summary asynchronously (don't block session end)
          meetingSummarizerService.generateSessionSummary(roomId, session.sessionId)
            .then(summary => {
              logger.info(`[RoomService] Auto-generated summary for session ${session.sessionId}`, {
                bullets: summary.bullets.length,
                actions: summary.actionItems.length,
                decisions: summary.decisions.length
              });
            })
            .catch(error => {
              logger.error('[RoomService] Failed to auto-generate summary', {
                sessionId: session.sessionId,
                error: error.message
              });
            });
        } catch (error) {
          logger.error('[RoomService] Summary generation error', {
            error: error.message
          });
        }
      }

      logger.info(`[RoomService] Session ended for room ${roomId}`, {
        sessionId: session.sessionId,
        duration: session.totalDuration
      });
      
      return session;
    } catch (error) {
      logger.error('[RoomService] Failed to end session', {
        roomId,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Update room statistics after session ends
   * @param {string} roomId - Room ID
   * @param {object} session - Completed session
   * @returns {Promise<void>}
   */
  async updateRoomStats(roomId, session) {
    try {
      const room = await Room.findByRoomId(roomId);
      if (!room) {
        return;
      }

      room.totalSessions += 1;
      room.totalDuration += session.totalDuration;
      
      // Count unique participants
      const uniqueParticipants = new Set(session.participants.map(p => p.userId));
      room.totalParticipants = Math.max(
        room.totalParticipants,
        uniqueParticipants.size
      );

      await room.save();

      logger.info(`[RoomService] Room stats updated for ${roomId}`, {
        totalSessions: room.totalSessions,
        totalDuration: room.totalDuration
      });
    } catch (error) {
      logger.error('[RoomService] Failed to update room stats', {
        roomId,
        error: error.message
      });
    }
  }

  /**
   * Get session history for a room
   * @param {string} roomId - Room ID
   * @param {number} limit - Max number of sessions to return
   * @returns {Promise<Array>} Array of sessions
   */
  async getSessionHistory(roomId, limit = 10) {
    try {
      return await Session.findRoomSessions(roomId, limit);
    } catch (error) {
      logger.error('[RoomService] Failed to get session history', {
        roomId,
        error: error.message
      });
      return [];
    }
  }

  /**
   * Get active session for a room
   * @param {string} roomId - Room ID
   * @returns {Promise<object|null>} Active session or null
   */
  async getActiveSession(roomId) {
    try {
      return await Session.findActiveByRoom(roomId);
    } catch (error) {
      logger.error('[RoomService] Failed to get active session', {
        roomId,
        error: error.message
      });
      return null;
    }
  }
}

export default new RoomService();
