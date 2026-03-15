import { v4 as uuidv4 } from 'uuid';
import logger from '../../shared/logger.js';
import { getRoom, saveRoom, getUser } from '../../shared/redis.js';
import { messageSchema } from '../../shared/validation.js';
import eventLogger from '../services/EventLogger.js';
import { syncMessage } from '../services/SupabaseRoomService.js';

export default function registerChatHandlers(io, socket) {
  socket.on('send-message', async (payload, callback) => {
    try {
      const validatedData = messageSchema.parse(payload);
      const { roomId, message } = validatedData;

      const room = await getRoom(roomId);
      if (!room) return callback?.({ success: false, error: 'Room not found' });

      // Use authoritative user info
      const user = socket.user || (await getUser(socket.id));
      if (!user) return callback?.({ success: false, error: 'User not found' });

      // PHASE 5: Centralized Moderation & Bot Detection
      const { default: moderationService } = await import('../services/ModerationService.js');
      
      const botCheck = await moderationService.checkBotActivity(roomId, user.id, 'chat');
      if (botCheck.bot && botCheck.severity === 'critical') {
          return callback?.({ success: false, error: 'Message blocked: suspicious activity' });
      }

      const modResult = await moderationService.handleModeration({
        roomId,
        userId: user.id,
        userName: user.name,
        contentType: 'chat',
        content: message.content
      });

      // Update message if filtered/blocked
      message.content = modResult.content;
      const moderationResult = modResult.result;

      // Handle block (HIGH/CRITICAL)
      if (modResult.blocked) {
          return callback?.({ 
            success: false, 
            error: 'Message blocked by content moderation',
            moderation: moderationResult 
          });
      }

      // PHASE 7: AI Assistant Integration
      if (message.content.startsWith('/') || message.content.toLowerCase().includes('assistant')) {
          const { default: assistantService } = await import('../services/AssistantService.js');
          const assistantResponse = await assistantService.processCommand(roomId, user.id, message.content);
          
          if (assistantResponse) {
              io.to(roomId).emit('assistant:response', {
                  ...assistantResponse,
                  timestamp: new Date()
              });
              
              // If it's a silent command (starts with /), we might not want to broadcast the command itself
              // But for now, we'll continue the normal chat flow.
          }
      }

      const messageData = {
        id: uuidv4(),
        userId: user.id,
        userName: user.name,
        content: message.content,
        timestamp: new Date(),
        moderated: !moderationResult.safe,
        moderationSeverity: moderationResult.severity
      };

      if (!room.messages) room.messages = [];
      room.messages.push(messageData);
      // Keep only last 100 messages to prevent document size growth
      if (room.messages.length > 100) room.messages.splice(0, room.messages.length - 100);
      
      await saveRoom(room);

      io.to(roomId).emit('new-message', messageData);
      callback?.({ success: true });
      
      // Log chat event (metadata only, not content if privacy concern, but Prompt implied Source of Truth)
      // Prompt said: MongoDB stores "events", Supabase "chat". 
      // User prompt: "MongoDB is append-only store for room events... voice transcripts...". 
      // It lists "messages" under SUPABASE. So I should log the *activity* here but maybe not the content unless required for analytics.
      // The prompt list "2.1 room_events" has "join | leave | mute | unmute | share". It doesn't explicitly list "chat".
      // I will log a generic 'chat' event for activity tracking.
      eventLogger.logRoomEvent(roomId, user.id, 'chat', { type: message.type || 'text' });
      
      // Sync message content to Supabase (Source of Truth)
      syncMessage(roomId, user.id, message.content, 'text');

    } catch (error) {
      logger.error('Error sending message:', error);
      callback?.({ success: false, error: 'Failed to send message' });
    }
  });

  socket.on('upload-file', async ({ roomId, file }, callback) => {
     try {
        const room = await getRoom(roomId);
        if (!room) {
          return callback?.({ success: false, error: 'Room not found' });
        }

        const user = socket.user || (await getUser(socket.id));
        if (user) {
            file.userName = user.name;
            file.userId = user.id;
        }

        if (!room.files) room.files = [];
        room.files.push(file);
        if (room.files.length > 50) room.files.splice(0, room.files.length - 50);

        await saveRoom(room);
        
        // Broadcast to EVERYONE in the room including the sender
        io.to(roomId).emit('new-file', file);
        callback?.({ success: true, file });
     } catch (err) {
         logger.error('File upload error:', err);
         callback?.({ success: false, error: err.message });
     }
  });
}
