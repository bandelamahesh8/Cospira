/**
 * AI Assistant Socket Handlers - Phase 7
 */

import assistantService from '../services/AssistantService.js';
import { getBrowserManager } from './browser.socket.js';
import logger from '../logger.js';

export default function registerAssistantHandlers(io, socket, sfuHandler) {
  /**
   * Listen for chat messages to detect commands
   */
  socket.on('assistant:command', async ({ roomId, text }, callback) => {
    try {
      const userId = socket.user?.id;
      if (!userId) return;

      const response = await assistantService.processCommand(roomId, userId, text);
      
      if (response) {
        // Broadcast the assistant's reply to the room
        io.to(roomId).emit('assistant:response', {
          ...response,
          timestamp: new Date()
        });

        // If it's a specific action (like starting a timer), trigger those events
        if (response.type === 'action') {
          handleAssistantAction(io, roomId, response, sfuHandler);
        }
      }

      callback?.({ success: !!response });
    } catch (error) {
      logger.error('[AssistantSocket] Failed to process assistant command:', error.message);
      callback?.({ success: false, error: 'Assistant failed to respond.' });
    }
  });
}

/**
 * Trigger system events based on assistant decisions
 */
async function handleAssistantAction(io, roomId, response, sfuHandler) {
  switch (response.action) {
    case 'browser_navigate':
      try {
        const manager = getBrowserManager(io, sfuHandler);
        let session = manager.getSession(roomId);
        if (!session) {
          await manager.startSession(roomId, response.url);
        } else {
          await manager.navigate(roomId, response.url);
        }
      } catch (err) {
        logger.error('[Assistant] Browser action failed:', err.message);
      }
      break;
    
    case 'timer_start':
      io.to(roomId).emit('room:timer-started', { 
        duration: response.duration,
        message: response.message
      });
      break;
    
    case 'poll_create':
      io.to(roomId).emit('room:poll-created', {
        question: response.question,
        options: response.options,
        id: Math.random().toString(36).substr(2, 9)
      });
      break;
  }
}
