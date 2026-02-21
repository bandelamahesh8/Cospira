
import { Transcript } from '../models/Transcript.js';
import logger from '../logger.js';

import LLMService from '../services/ai/LLMService.js';
import assistantService from '../services/AssistantService.js';

export default function registerAIHandlers(io, socket) {
  
  // Handle incoming transcript
  socket.on('transcript', async (data) => {
    try {
      if (!socket.user && !socket.handshake.query.userId) {
          // Allow anonymous transcripts if needed, or strictly enforce auth
          // For now, valid if user is in room
      }

      const { roomId, text, timestamp } = data;
      const userId = socket.user?.sub || socket.handshake.query.userId || socket.id;
      const userName = socket.user?.name || "Guest"; // Could fetch from Redis room data if needed

      if (!roomId || !text) return;

      // Import content moderator
      const { moderateContent, SEVERITY } = await import('../services/ai/ContentModerator.js');

      // Moderate transcript content
      const moderationResult = moderateContent(text, {
        userId,
        roomId,
        type: 'transcript'
      });

      // Log violations but don't block transcripts (they're real-time speech)
      // Instead, flag them for review
      if (!moderationResult.safe) {
        logger.warn(`[Transcript] Moderation violation by ${userName}: ${moderationResult.severity}`);

        // For critical violations, alert host/admin
        if (moderationResult.severity === SEVERITY.CRITICAL) {
          io.to(roomId).emit('moderation-alert', {
            userId,
            userName,
            severity: moderationResult.severity,
            type: 'transcript',
            violations: moderationResult.violations.map(v => v.type)
          });
        }
      }

      // 1. Store in MongoDB (with moderation metadata)
      const transcript = new Transcript({
        roomId,
        userId,
        userName,
        text,
        timestamp: new Date(timestamp),
        isFinal: true,
        moderated: !moderationResult.safe,
        moderationSeverity: moderationResult.severity,
        violations: moderationResult.violations
      });
      await transcript.save();

      // 2. Broadcast to room (so others see it live)
      socket.to(roomId).emit('transcript-received', {
        userId,
        userName,
        text,
        timestamp: transcript.timestamp,
        isFinal: true
      });

      // 3. AI Assistant Trigger check
      // Only process if it explicitly mentions Cospira or Assistant, or is a question to the room
      // We use the AssistantService's own logic for detection
      const aiResponse = await assistantService.processCommand(roomId, userId, text);
      
      if (aiResponse) {
        // Broadcast AI response
        io.to(roomId).emit('assistant:response', {
           content: aiResponse.message,
           type: aiResponse.type || 'text',
           action: aiResponse.action,
           data: aiResponse.data
        });
      }
      
    } catch (error) {
      logger.error('Error handling transcript:', error);
    }
  });

  // Handle Summary Generation Request
  socket.on('generate-summary', async (data) => {
    const { roomId, broadcast = true } = data; // Default to broadcast=true
    if (!roomId) return;

    logger.info(`[AI] Generating summary for room ${roomId} (Broadcast: ${broadcast})`);

    try {
        // Fetch transcripts
        const transcripts = await Transcript.find({ roomId }).sort({ timestamp: 1 }).lean();
        
        if (transcripts.length === 0) {
            socket.emit('summary-error', { message: 'No transcripts found for this meeting.' });
            return;
        }

        // Call LLM
        const result = await LLMService.generateMeetingSummary(transcripts);

        const payload = {
            summary: result.summary,
            actionItems: result.actionItems,
            timestamp: new Date()
        };

        if (broadcast) {
            // Broadcast result to room
            io.to(roomId).emit('summary-generated', payload);
        } else {
            // Send only to requester
            socket.emit('summary-generated', payload);
        }

    } catch (error) {
        logger.error(`[AI] Summary generation failed for room ${roomId}:`, error);
        socket.emit('summary-error', { message: 'Failed to generate summary. Please try again.' });
    }
  });
}
