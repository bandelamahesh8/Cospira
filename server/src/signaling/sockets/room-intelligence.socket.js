/**
 * Room Intelligence Socket Handlers - Phase 3: Smart Rooms
 * 
 * Handles AI-powered room classification and mode management.
 * Integrated with RoomIntelligenceService and MongoDB Room Model.
 */

import roomIntelligenceService from '../../api/services/RoomIntelligenceService.js';
import roomService from '../../api/services/RoomService.js';
import eventLogger from '../../api/services/EventLogger.js';
import logger from '../../shared/logger.js';
import { getModeConfig, ROOM_MODES } from '../../api/services/ai/RoomClassifier.js';

export default function registerRoomIntelligenceHandlers(io, socket) {
  
  /**
   * Analyze room and suggest optimal mode (Request/Response)
   */
  socket.on('analyze-room', async ({ roomId }, callback) => {
    try {
      const result = await roomIntelligenceService.analyzeRoom(roomId);
      
      callback?.({
        success: true,
        mode: result.currentMode,
        config: result.modeConfig,
        confidence: result.confidence,
        activityType: result.activityType
      });
    } catch (error) {
      logger.error('[RoomIntelligence] analyze-room failed:', error.message);
      callback?.({ success: false, error: error.message });
    }
  });

  /**
   * Manually change room mode (Apply mode manually)
   */
  socket.on('room:set-mode', async ({ roomId, mode }, callback) => {
    try {
      const userId = socket.user?.id;
      if (!userId) return callback?.({ success: false, error: 'Auth required' });

      const room = await roomService.getRoom(roomId);
      if (!room) return callback?.({ success: false, error: 'Room not found' });

      // Only host or members can change mode manually
      const role = room.getMemberRole(userId);
      if (role !== 'host' && role !== 'member') {
        return callback?.({ success: false, error: 'Permission denied' });
      }

      const config = await roomIntelligenceService.setRoomMode(roomId, mode);

      // Notify all users in room
      io.to(roomId).emit('room:mode-changed', {
        mode,
        config,
        appliedBy: userId
      });

      // Log the management event
      eventLogger.logRoomEvent(roomId, userId, 'moderate', {
        action: 'set_mode',
        mode
      });

      callback?.({ success: true, mode, config });
    } catch (error) {
      logger.error('[RoomIntelligence] set-mode failed:', error.message);
      callback?.({ success: false, error: error.message });
    }
  });

  /**
   * Alias for backward compatibility if needed, or keeping it as the 'apply' intent
   */
  socket.on('apply-room-mode', async ({ roomId, mode }, callback) => {
    // Redirect to room:set-mode logic
    socket.emit('room:set-mode', { roomId, mode }, callback);
  });

  /**
   * Re-enable auto-mode
   */
  socket.on('room:enable-auto-mode', async ({ roomId }, callback) => {
    try {
      const userId = socket.user?.id;
      const room = await roomService.getRoom(roomId);
      
      if (!room) return callback?.({ success: false, error: 'Room not found' });

      const role = room.getMemberRole(userId);
      if (role !== 'host' && role !== 'member') {
        return callback?.({ success: false, error: 'Permission denied' });
      }

      const result = await roomIntelligenceService.enableAutoMode(roomId);

      io.to(roomId).emit('room:intelligence-update', {
        mode: result.currentMode,
        config: result.modeConfig,
        confidence: result.confidence,
        reason: 'Auto-mode re-enabled'
      });

      callback?.({ success: true, mode: result.currentMode });
    } catch (error) {
      callback?.({ success: false, error: error.message });
    }
  });

  /**
   * Get current room intelligence state
   */
  socket.on('room:get-intelligence', async ({ roomId }, callback) => {
    try {
      const room = await roomService.getRoom(roomId);
      if (!room) return callback?.({ success: false, error: 'Room not found' });

      const { currentMode, confidence, activityType, autoModeEnabled } = room.intelligence;
      const config = getModeConfig(currentMode);

      callback?.({
        success: true,
        intelligence: {
          currentMode,
          confidence,
          activityType,
          autoModeEnabled,
          config
        }
      });
    } catch (error) {
      callback?.({ success: false, error: error.message });
    }
  });

  /**
   * Backward compatibility: suggestion check
   */
  socket.on('get-room-suggestions', async ({ roomId }, callback) => {
    try {
      const result = await roomIntelligenceService.analyzeRoom(roomId);
      const room = await roomService.getRoom(roomId);

      const isDifferent = room.intelligence.currentMode !== result.currentMode;

      callback?.({
        success: true,
        shouldSuggest: isDifferent && result.confidence >= 0.5,
        currentMode: room.intelligence.currentMode,
        suggestedMode: result.currentMode,
        confidence: result.confidence,
        config: result.modeConfig
      });
    } catch (error) {
      callback?.({ success: false, error: error.message });
    }
  });

  /**
   * Get mode configuration
   */
  socket.on('get-mode-config', async ({ mode }, callback) => {
    try {
      const config = getModeConfig(mode);
      callback?.({ success: true, config });
    } catch (error) {
      callback?.({ success: false, error: 'Failed to get config' });
    }
  });

  logger.debug('[RoomIntelligence] Handlers registered for socket:', socket.id);
}
