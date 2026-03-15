/**
 * AI Assistant Service - Phase 7
 * 
 * Context-aware assistant for room management and productivity.
 */

import { Transcript } from '../models/Transcript.js';
import { Room } from '../models/Room.js';
import roomService from './RoomService.js';
import meetingSummarizerService from './MeetingSummarizerService.js';
import LLMService from './ai/LLMService.js';
import logger from '../../shared/logger.js';

class AssistantService {
  /**
   * Process a message or command for the assistant
   */
  async processCommand(roomId, userId, text) {
    logger.info(`[AssistantService] Request from ${userId} in ${roomId}: "${text}"`);
    try {
      let response = null;
      // 1. Check if it's a command
      if (text.startsWith('/')) {
        response = await this.handleSlashCommand(roomId, userId, text);
      }
      // 2. Check if the assistant is mentioned
      else if (text.toLowerCase().includes('assistant') || text.toLowerCase().includes('cospira help')) {
        response = await this.handleNaturalLanguage(roomId, userId, text);
      }

      if (response) {
        logger.info(`[AssistantService] Response to ${userId} in ${roomId}:`, JSON.stringify(response));
      }
      return response;
    } catch (error) {
      logger.error('[AssistantService] Command processing failed:', error.stack);
      return { type: 'error', message: 'I encountered an error while processing your request.' };
    }
  }

  /**
   * Handle explicit slash commands
   */
  async handleSlashCommand(roomId, userId, text) {
    const parts = text.split(' ');
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    switch (command) {
      case '/summarize':
        return await this.generateQuickSummary(roomId);
      
      case '/timer':
        const minutes = parseInt(args[0]) || 5;
        return { type: 'action', action: 'timer_start', duration: minutes * 60, message: `Starting a ${minutes} minute timer.` };
      
      case '/poll':
        // Usage: /poll "Question?" "Opt 1" "Opt 2"
        const pollMatch = text.match(/"([^"]+)"/g);
        if (pollMatch && pollMatch.length >= 2) {
          const question = pollMatch[0].replace(/"/g, '');
          const options = pollMatch.slice(1).map(o => o.replace(/"/g, ''));
          return { type: 'action', action: 'poll_create', question, options };
        }
        return { type: 'error', message: 'Invalid poll format. Use: /poll "Question" "Option 1" "Option 2"' };

      case '/browse':
        const url = args[0] || 'https://www.google.com';
        return { type: 'action', action: 'browser_navigate', url, message: `Opening ${url} in the virtual browser.` };

      default:
        return { type: 'info', message: `Available commands: /summarize, /timer [min], /poll "Q" "A" "B", /browse [url]` };
    }
  }

  /**
   * Handle natural language requests
   */
  async handleNaturalLanguage(roomId, userId, text) {
    // Basic intent detection
    if (text.toLowerCase().includes('what happened') || text.toLowerCase().includes('recap')) {
      return await this.generateQuickSummary(roomId);
    }

    if (text.toLowerCase().includes('who is') || text.toLowerCase().includes('members')) {
      const room = await roomService.getRoom(roomId);
      const participantCount = room.members.length;
      return { type: 'info', message: `There are currently ${participantCount} members in this room.` };
    }

    // Advanced: Context-Aware Response via LLM
    try {
      // 1. Fetch recent context (messages from last 15 mins)
      const startTime = new Date(Date.now() - 15 * 60 * 1000);
      const transcripts = await Transcript.find({ 
        roomId, 
        timestamp: { $gte: startTime } 
      })
      .sort({ timestamp: -1 })
      .limit(20);

      // 2. Format context (reverse to chronological)
      const context = transcripts.reverse().map(t => `${t.userId}: ${t.content}`).join('\n');

      // 3. Construct Prompt
      const prompt = `You are Cospira AI, a helpful virtual assistant in a meeting room.
      
Context (Recent Conversation):
${context || '(No recent messages)'}

User (${userId}): ${text}

Provide a helpful, concise response based on the context. If you don't know the answer, just say you don't know.`;

      // 4. Generate Response
      const aiResponse = await LLMService.generateCompletion(prompt, {
        maxTokens: 150,
        temperature: 0.7
      });

      return { type: 'text', message: aiResponse };

    } catch (error) {
       logger.error('[AssistantService] LLM generation failed:', error);
       return { type: 'info', message: "I'm here to help, but my brain is offline momentarily. Try /summarize." };
    }
  }

  /**
   * Quick recap of the last 10 minutes
   */
  async generateQuickSummary(roomId) {
    try {
      const startTime = new Date(Date.now() - 10 * 60 * 1000); // Last 10 mins
      const transcripts = await Transcript.find({ 
        roomId, 
        timestamp: { $gte: startTime } 
      }).sort({ timestamp: 1 });

      if (transcripts.length === 0) {
        return { type: 'info', message: "Nothing has happened in the last 10 minutes yet!" };
      }

      const summary = await meetingSummarizerService.generateQuickSummary(roomId, transcripts);
      return { 
        type: 'summary', 
        message: 'Here is a quick recap of the last 10 minutes:', 
        data: summary 
      };
    } catch (err) {
      return { type: 'error', message: 'Failed to generate summary.' };
    }
  }
}

export default new AssistantService();
