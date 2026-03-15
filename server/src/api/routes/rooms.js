/**
 * Room API Routes
 * 
 * RESTful API endpoints for room management
 */

import express from 'express';
import roomService from '../services/RoomService.js';
import eventLogger from '../services/EventLogger.js';
import { checkUserPermission } from '../middleware/permissions.js';
import { VoiceTranscript } from '../models/VoiceTranscript.js';
import logger from '../../shared/logger.js';
import { getRoom } from '../../shared/redis.js';
import orpionService from '../services/OrpionService.js';
import { deleteRoomUploads } from '../../utils/fileCleanup.js';

const router = express.Router();

/**
 * GET /api/rooms/:roomId
 * Get room details
 */
router.get('/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user?.id; // From auth middleware

    const room = await roomService.getRoom(roomId);
    
    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found'
      });
    }

    // Get user's role if authenticated
    let userRole = null;
    if (userId) {
      userRole = room.getMemberRole(userId);
    }

    // Return room data (hide sensitive info for non-members)
    const roomData = {
      roomId: room.roomId,
      name: room.name,
      purpose: room.purpose,
      createdAt: room.createdAt,
      isActive: room.isActive,
      memberCount: room.members.length,
      totalSessions: room.totalSessions,
      totalDuration: room.totalDuration,
      settings: {
        allowGuests: room.settings.allowGuests,
        requireApproval: room.settings.requireApproval,
        maxParticipants: room.settings.maxParticipants
      }
    };

    // Include additional info for members
    if (userRole) {
      roomData.userRole = userRole;
      roomData.isHost = room.isHost(userId);
      roomData.members = room.members.map(m => ({
        userId: m.userId,
        role: m.role,
        joinedAt: m.joinedAt,
        lastSeenAt: m.lastSeenAt
      }));
    }

    res.json({
      success: true,
      room: roomData
    });
  } catch (error) {
    logger.error('[RoomAPI] Error getting room', {
      roomId: req.params.roomId,
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/rooms/user/:userId
 * Get all rooms for a user
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { activeOnly = 'true' } = req.query;

    // Check if requesting user is authorized (must be the user themselves or admin)
    if (req.user?.id !== userId && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    const rooms = await roomService.getUserRooms(userId, activeOnly === 'true');

    const roomList = rooms.map(room => ({
      roomId: room.roomId,
      name: room.name,
      purpose: room.purpose,
      createdAt: room.createdAt,
      lastActiveAt: room.lastActiveAt,
      isActive: room.isActive,
      userRole: room.getMemberRole(userId),
      isHost: room.isHost(userId),
      memberCount: room.members.length,
      totalSessions: room.totalSessions
    }));

    res.json({
      success: true,
      rooms: roomList
    });
  } catch (error) {
    logger.error('[RoomAPI] Error getting user rooms', {
      userId: req.params.userId,
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/rooms
 * Get all active rooms (public listing)
 */
router.get('/', async (req, res) => {
  try {
    const rooms = await roomService.getActiveRooms();

    const roomList = rooms.map(room => ({
      roomId: room.roomId,
      name: room.name,
      name: room.name,
      purpose: room.purpose,
      createdAt: room.createdAt,
      memberCount: room.members.length,
      requiresPassword: !!room.passwordHash || (room.accessType === 'password') || (room.accessType === 'private') || room.settings.requireApproval,
      accessType: room.accessType || (room.settings.requireApproval ? 'private' : 'public'),
      
      settings: {
        allowGuests: room.settings.allowGuests,
        requireApproval: room.settings.requireApproval,
        maxParticipants: room.settings.maxParticipants,
        mode: room.settings.mode
      }
    }));

    res.json({
      success: true,
      rooms: roomList
    });
  } catch (error) {
    logger.error('[RoomAPI] Error getting active rooms', {
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * PATCH /api/rooms/:roomId
 * Update room settings (host only)
 */
router.patch('/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const room = await roomService.getRoom(roomId);
    
    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found'
      });
    }

    // Check if user is host
    if (!room.isHost(userId)) {
      return res.status(403).json({
        success: false,
        error: 'Only host can update room settings'
      });
    }

    // Update settings
    const updatedRoom = await roomService.updateRoomSettings(roomId, userId, req.body);

    // Log settings change
    await eventLogger.logSettingsChanged(roomId, userId, req.body);

    res.json({
      success: true,
      room: {
        roomId: updatedRoom.roomId,
        name: updatedRoom.name,
        purpose: updatedRoom.purpose,
        settings: updatedRoom.settings
      }
    });
  } catch (error) {
    logger.error('[RoomAPI] Error updating room', {
      roomId: req.params.roomId,
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

/**
 * DELETE /api/rooms/:roomId
 * Archive room (host only)
 */
router.delete('/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const room = await roomService.getRoom(roomId);
    
    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found'
      });
    }

    // Check if user is host
    if (!room.isHost(userId)) {
      return res.status(403).json({
        success: false,
        error: 'Only host can archive room'
      });
    }

    // End active session if exists
    await roomService.endSession(roomId, userId);

    // Archive room
    await roomService.archiveRoom(roomId, userId);

    // Purge assets
    await deleteRoomUploads(roomId);

    res.json({
      success: true,
      message: 'Room archived successfully'
    });
  } catch (error) {
    logger.error('[RoomAPI] Error archiving room', {
      roomId: req.params.roomId,
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

/**
 * GET /api/rooms/:roomId/events
 * Get room event history
 */
router.get('/:roomId/events', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { limit = 50, type } = req.query;
    const userId = req.user?.id;

    const room = await roomService.getRoom(roomId);
    
    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found'
      });
    }

    // Check if user is a member
    const userRole = room.getMemberRole(userId);
    if (!userRole) {
      return res.status(403).json({
        success: false,
        error: 'Must be a room member to view events'
      });
    }

    let events;
    if (type) {
      events = await eventLogger.getRoomEventsByType(roomId, type, parseInt(limit));
    } else {
      events = await eventLogger.getRecentRoomEvents(roomId, parseInt(limit));
    }

    res.json({
      success: true,
      events
    });
  } catch (error) {
    logger.error('[RoomAPI] Error getting room events', {
      roomId: req.params.roomId,
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/rooms/:roomId/sessions
 * Get room session history
 */
router.get('/:roomId/sessions', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { limit = 10 } = req.query;
    const userId = req.user?.id;

    const room = await roomService.getRoom(roomId);
    
    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found'
      });
    }

    // Check if user is a member
    const userRole = room.getMemberRole(userId);
    if (!userRole) {
      return res.status(403).json({
        success: false,
        error: 'Must be a room member to view sessions'
      });
    }

    const sessions = await roomService.getSessionHistory(roomId, parseInt(limit));

    const sessionList = sessions.map(session => ({
      sessionId: session.sessionId,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      totalDuration: session.totalDuration,
      peakParticipants: session.peakParticipants,
      participantCount: session.participants.length,
      isActive: session.isActive,
      purpose: session.purpose
    }));

    res.json({
      success: true,
      sessions: sessionList
    });
  } catch (error) {
    logger.error('[RoomAPI] Error getting room sessions', {
      roomId: req.params.roomId,
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/rooms/:roomId/sessions/:sessionId
 * Get detailed session information
 */
router.get('/:roomId/sessions/:sessionId', async (req, res) => {
  try {
    const { roomId, sessionId } = req.params;
    const userId = req.user?.id;

    const room = await roomService.getRoom(roomId);
    
    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found'
      });
    }

    // Check if user is a member
    const userRole = room.getMemberRole(userId);
    if (!userRole) {
      return res.status(403).json({
        success: false,
        error: 'Must be a room member to view session details'
      });
    }

    const { Session } = await import('../models/Session.js');
    const session = await Session.findOne({ sessionId }).populate('summaryId');

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    res.json({
      success: true,
      session: {
        sessionId: session.sessionId,
        roomId: session.roomId,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        totalDuration: session.totalDuration,
        peakParticipants: session.peakParticipants,
        participants: session.participants,
        purpose: session.purpose,
        quality: session.quality,
        summary: session.summaryId,
        transcriptCount: session.transcriptCount,
        actionItemsCount: session.actionItemsCount,
        decisionsCount: session.decisionsCount
      }
    });
  } catch (error) {
    logger.error('[RoomAPI] Error getting session details', {
      roomId: req.params.roomId,
      sessionId: req.params.sessionId,
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});


/**
 * POST /api/rooms/:roomId/summary
 * Generate AI Summary (Time-Gated)
 */
router.post('/:roomId/summary', async (req, res) => {
    try {
        const { roomId } = req.params;
        // Fetch from Redis to get active messages
        const room = await getRoom(roomId);
        
        if (!room) {
            return res.status(404).json({ error: 'Room not found or inactive' });
        }

        // 1. Time Gate Check (5 Minutes)
        const createdAt = new Date(room.createdAt).getTime();
        const now = Date.now();
        const diffSeconds = (now - createdAt) / 1000;
        const MIN_DURATION = 5 * 60; // 5 minutes

        if (diffSeconds < MIN_DURATION) {
            const remaining = Math.ceil(MIN_DURATION - diffSeconds);
            const minutes = Math.floor(remaining / 60);
            const seconds = remaining % 60;
            
            return res.status(423).json({
                status: 'locked',
                message: `Neural Analysis Locked. Available in ${minutes}m ${seconds}s.`,
                remainingSeconds: remaining
            });
        }

        // 2. Aggregate Conversation & Activity Context
        const [events, transcripts] = await Promise.all([
            eventLogger.getRecentRoomEvents(roomId, 100),
            VoiceTranscript.find({ roomId }).sort({ createdAt: -1 }).limit(50).lean().catch(() => [])
        ]);

        const eventSummary = events
            .map(e => `[${new Date(e.timestamp).toLocaleTimeString()}] EVENT: ${e.eventType} by ${e.userId} ${JSON.stringify(e.metadata || {})}`)
            .join('\n');

        const transcriptText = transcripts
            .map(t => `[${new Date(t.createdAt).toLocaleTimeString()}] TRANSCRIPT: ${t.userName || t.userId}: ${t.text}`)
            .join('\n');

        const messageText = (room.messages || [])
            .map(m => `[${new Date(m.timestamp).toLocaleTimeString()}] CHAT: ${m.user?.name || 'User'}: ${m.text}`)
            .join('\n');

        const enrichedContext = `
=== SESSION EVENTS ===
${eventSummary || 'No significant events logged.'}

=== VOICE TRANSCRIPTS ===
${transcriptText || 'No voice transcripts available.'}

=== CHAT MESSAGES ===
${messageText || 'No chat messages.'}
        `.trim();

        const uniqueAuthors = new Set([
            ...(room.messages || []).map(m => m.user?.name || m.user?.id || 'Unknown'),
            ...transcripts.map(t => t.userName || t.userId)
        ]);
        
        const wordCount = enrichedContext.split(/\s+/).length;
        
        // Quality Gate
        if (wordCount < 50 && (!room.messages || room.messages.length < 3)) { 
             return res.status(400).json({
                status: 'blocked',
                message: 'Not enough data for superior analysis (Need more activity or conversation).',
                stats: { msgCount: room.messages?.length || 0, wordCount }
             });
        }

        // 3. Generate Summary
        const summary = await orpionService.generateSummary(enrichedContext);

        res.json({
            status: 'success',
            summary,
            stats: {
                msgCount: room.messages.length,
                wordCount,
                participantCount: uniqueAuthors.size
            }
        });

    } catch (error) {
        logger.error('[OrpionAPI] Summary generation failed:', error);
        res.status(500).json({ error: error.message || 'Internal Analysis Error' });
    }
});

export default router;
