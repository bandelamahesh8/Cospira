/**
 * Meeting Summarizer Service
 * 
 * Generates meeting summaries from transcripts using AI.
 * Extracts key points, action items, and decisions.
 */

import { MeetingSummary } from '../models/MeetingSummary.js';
import { Transcript } from '../models/Transcript.js';
import { Session } from '../models/Session.js';
import LLMService from './ai/LLMService.js';
import logger from '../../shared/logger.js';

class MeetingSummarizerService {
  /**
   * Generate summary for a session
   * @param {string} roomId - Room ID
   * @param {string} sessionId - Session ID
   * @returns {Promise<object>} Generated summary
   */
  async generateSessionSummary(roomId, sessionId) {
    try {
      // Get session details
      const session = await Session.findOne({ sessionId });
      if (!session) {
        throw new Error('Session not found');
      }

      // Get transcripts for this session
      const transcripts = await Transcript.find({
        roomId,
        timestamp: {
          $gte: session.startedAt,
          $lte: session.endedAt || new Date()
        }
      }).sort({ timestamp: 1 });

      if (transcripts.length === 0) {
        logger.warn(`[MeetingSummarizer] No transcripts found for session ${sessionId}`);
        return this.createEmptySummary(roomId, sessionId, session);
      }

      // Combine transcripts into conversation
      const conversation = this.formatTranscripts(transcripts);

      // Generate summary using AI
      const aiSummary = await this.generateAISummary(conversation);

      // Create summary document
      const summary = new MeetingSummary({
        roomId,
        sessionId,
        bullets: aiSummary.bullets || [],
        actionItems: aiSummary.actionItems || [],
        decisions: aiSummary.decisions || [],
        generatedAt: new Date(),
        generatedBy: 'ai',
        transcriptCount: transcripts.length,
        duration: session.totalDuration,
        participantCount: session.participants.length,
        confidence: aiSummary.confidence || 0.8
      });

      await summary.save();

      // Update session with summary reference
      session.summaryId = summary._id;
      session.actionItemsCount = summary.actionItems.length;
      session.decisionsCount = summary.decisions.length;
      await session.save();

      logger.info(`[MeetingSummarizer] Summary generated for session ${sessionId}`, {
        bullets: summary.bullets.length,
        actions: summary.actionItems.length,
        decisions: summary.decisions.length
      });

      return summary;
    } catch (error) {
      logger.error('[MeetingSummarizer] Failed to generate summary', {
        roomId,
        sessionId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Generate quick summary for late joiners
   * @param {string} roomId - Room ID
   * @param {number} lastMinutes - Number of minutes to summarize
   * @returns {Promise<object>} Quick summary
   */
  async generateQuickSummary(roomId, lastMinutes = 10) {
    try {
      const cutoffTime = new Date(Date.now() - lastMinutes * 60 * 1000);

      // Get recent transcripts
      const transcripts = await Transcript.find({
        roomId,
        timestamp: { $gte: cutoffTime }
      }).sort({ timestamp: 1 });

      if (transcripts.length === 0) {
        return {
          summary: 'No recent conversation to summarize.',
          bullets: [],
          duration: lastMinutes
        };
      }

      const conversation = this.formatTranscripts(transcripts);

      // Generate quick summary (shorter prompt)
      const prompt = `Summarize the last ${lastMinutes} minutes of this conversation in 3 bullet points or less. Be concise and focus on key topics discussed.

Conversation:
${conversation}

Provide ONLY the bullet points, one per line, starting with "- ".`;

      const response = await LLMService.generateCompletion(prompt, {
        maxTokens: 200,
        temperature: 0.3
      });

      const bullets = response
        .split('\n')
        .filter(line => line.trim().startsWith('-'))
        .map(line => line.trim().substring(2).trim());

      return {
        summary: bullets.join(' '),
        bullets,
        duration: lastMinutes,
        transcriptCount: transcripts.length
      };
    } catch (error) {
      logger.error('[MeetingSummarizer] Failed to generate quick summary', {
        roomId,
        error: error.message
      });
      return {
        summary: 'Unable to generate summary at this time.',
        bullets: [],
        duration: lastMinutes
      };
    }
  }

  /**
   * Format transcripts into readable conversation
   * @param {Array} transcripts - Array of transcript documents
   * @returns {string} Formatted conversation
   */
  formatTranscripts(transcripts) {
    return transcripts
      .map(t => `${t.userName || 'Speaker'}: ${t.text}`)
      .join('\n');
  }

  /**
   * Generate AI summary from conversation
   * @param {string} conversation - Formatted conversation text
   * @returns {Promise<object>} AI-generated summary
   */
  async generateAISummary(conversation) {
    const prompt = `You are a meeting assistant. Analyze the following conversation and provide:

1. Key Points (max 5 bullet points)
2. Action Items (tasks that need to be done, with owner if mentioned)
3. Decisions Made (important decisions or agreements)

Conversation:
${conversation}

Respond in JSON format:
{
  "bullets": ["point 1", "point 2", ...],
  "actionItems": [
    {
      "text": "action description",
      "owner": "person name or 'unassigned'",
      "priority": "low|medium|high"
    }
  ],
  "decisions": [
    {
      "decision": "decision description",
      "owner": "person responsible or null"
    }
  ],
  "confidence": 0.0-1.0
}

Be concise. Focus on actionable items. If no action items or decisions, use empty arrays.`;

    try {
      const response = await LLMService.generateCompletion(prompt, {
        maxTokens: 1000,
        temperature: 0.3,
        responseFormat: 'json'
      });

      // Parse JSON response
      const parsed = JSON.parse(response);

      // Validate and normalize
      return {
        bullets: (parsed.bullets || []).slice(0, 5),
        actionItems: (parsed.actionItems || []).map(item => ({
          text: item.text,
          owner: item.owner === 'unassigned' ? 'unassigned' : item.owner,
          ownerName: item.owner,
          priority: item.priority || 'medium',
          status: 'pending',
          createdBy: 'ai',
          createdAt: new Date()
        })),
        decisions: (parsed.decisions || []).map(decision => ({
          decision: decision.decision,
          owner: decision.owner || null,
          ownerName: decision.owner,
          status: 'proposed',
          votes: [],
          createdBy: 'ai',
          createdAt: new Date()
        })),
        confidence: parsed.confidence || 0.8
      };
    } catch (error) {
      logger.error('[MeetingSummarizer] Failed to parse AI response', {
        error: error.message
      });

      // Fallback: basic summary
      return {
        bullets: ['Meeting discussion recorded'],
        actionItems: [],
        decisions: [],
        confidence: 0.5
      };
    }
  }

  /**
   * Create empty summary for sessions with no transcripts
   * @param {string} roomId - Room ID
   * @param {string} sessionId - Session ID
   * @param {object} session - Session document
   * @returns {Promise<object>} Empty summary
   */
  async createEmptySummary(roomId, sessionId, session) {
    const summary = new MeetingSummary({
      roomId,
      sessionId,
      bullets: ['No conversation recorded'],
      actionItems: [],
      decisions: [],
      generatedAt: new Date(),
      generatedBy: 'ai',
      transcriptCount: 0,
      duration: session.totalDuration,
      participantCount: session.participants.length,
      confidence: 0
    });

    await summary.save();
    return summary;
  }

  /**
   * Update action item status
   * @param {string} summaryId - Summary ID
   * @param {string} actionId - Action item ID
   * @param {string} status - New status
   * @param {string} userId - User making the update
   * @returns {Promise<object>} Updated summary
   */
  async updateActionStatus(summaryId, actionId, status, userId) {
    try {
      const summary = await MeetingSummary.findById(summaryId);
      if (!summary) {
        throw new Error('Summary not found');
      }

      summary.updateActionStatus(actionId, status);
      await summary.save();

      logger.info(`[MeetingSummarizer] Action status updated`, {
        summaryId,
        actionId,
        status,
        userId
      });

      return summary;
    } catch (error) {
      logger.error('[MeetingSummarizer] Failed to update action status', {
        summaryId,
        actionId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Add vote to decision
   * @param {string} summaryId - Summary ID
   * @param {string} decisionId - Decision ID
   * @param {string} userId - User ID
   * @param {string} userName - User name
   * @param {string} vote - Vote (yes, no, abstain)
   * @returns {Promise<object>} Updated summary
   */
  async voteOnDecision(summaryId, decisionId, userId, userName, vote) {
    try {
      const summary = await MeetingSummary.findById(summaryId);
      if (!summary) {
        throw new Error('Summary not found');
      }

      summary.addVoteToDecision(decisionId, userId, userName, vote);
      await summary.save();

      logger.info(`[MeetingSummarizer] Vote recorded`, {
        summaryId,
        decisionId,
        userId,
        vote
      });

      return summary;
    } catch (error) {
      logger.error('[MeetingSummarizer] Failed to record vote', {
        summaryId,
        decisionId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get pending actions for a user across all rooms
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Pending actions
   */
  async getUserPendingActions(userId) {
    try {
      const summaries = await MeetingSummary.findPendingActionsForUser(userId);
      
      const actions = [];
      summaries.forEach(summary => {
        summary.actionItems.forEach(item => {
          if (item.owner === userId && 
              (item.status === 'pending' || item.status === 'in_progress')) {
            actions.push({
              actionId: item._id,
              text: item.text,
              status: item.status,
              priority: item.priority,
              dueDate: item.dueDate,
              roomId: summary.roomId,
              sessionId: summary.sessionId,
              createdAt: item.createdAt
            });
          }
        });
      });

      return actions;
    } catch (error) {
      logger.error('[MeetingSummarizer] Failed to get user actions', {
        userId,
        error: error.message
      });
      return [];
    }
  }

  /**
   * Get latest summary for a room
   * @param {string} roomId - Room ID
   * @returns {Promise<object|null>} Latest summary
   */
  async getLatestSummary(roomId) {
    try {
      return await MeetingSummary.getLatestForRoom(roomId);
    } catch (error) {
      logger.error('[MeetingSummarizer] Failed to get latest summary', {
        roomId,
        error: error.message
      });
      return null;
    }
  }
}

export default new MeetingSummarizerService();
