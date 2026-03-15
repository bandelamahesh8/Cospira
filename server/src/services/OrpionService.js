import LLMService from './ai/LLMService.js';
import logger from '../logger.js';

class OrpionService {
  constructor() {
    // Orpion now leverages the centralized LLMService
  }

  /**
   * Generates a structured summary for a conversation using Gemini
   * @param {string} conversationText - The full transcript of the conversation
   * @returns {Promise<string>} - The generated summary in markdown format
   */
  async generateSummary(conversationText) {

    if (!conversationText || conversationText.trim().length < 50) {
      throw new Error('Not enough conversation context to analyze.');
    }

    const prompt = `
    You are the CORE ORPION INTELLIGENCE, a superior AI observer for Cospira.
    
    Analyze the provided session context (Events, Transcripts, and Chat) and produce a high-fidelity, structured intelligence report in VALID JSON format.
    
    Your summary must observe every moment in the room:
    1. Screensharing activities and presentations.
    2. Polls deployed and their outcomes/consensus.
    3. Voice talk patterns and key spoken decisions.
    4. Chat interactions and shared media/files.
    5. Games played and virtual browser usage.

    JSON Structure Requirements:
    {
      "gist": "A 1-sentence executive overview of the session purpose and energy.",
      "milestones": ["List of specific key moments", "Events", "Polls", "Games"],
      "decisions": ["Specific decisions reached", "Consensus points"],
      "actionProtocol": ["Clear, concise next steps or items to follow up on"],
      "sentiment": "positive | neutral | negative"
    }

    Guidelines:
    - Use "simple terms" that are easily understandable.
    - Be highly accurate and avoid generic summaries.
    - Be concise but complete.
    - Output ONLY pure JSON. No markdown backticks, no introduction.

    ---
    Session Context:
    ${conversationText}
    `;

    try {
      logger.info('[OrpionService] Sending request to Gemini (Advanced Mode via LLMService)...');
      const text = await LLMService.generateContent(prompt);
      
      if (!text) throw new Error('AI returned empty response');
      
      // Sanitization: Remove potential markdown wrappers if Gemini ignores instructions
      if (text.startsWith('```json')) text = text.replace(/```json|```/g, '').trim();
      
      try {
        const parsed = JSON.parse(text);
        logger.info('[OrpionService] Structured analysis complete.');
        return JSON.stringify(parsed); // Return as stringified JSON for the router to handle
      } catch (e) {
        logger.warn('[OrpionService] AI failed to return valid JSON. Falling back to paragraph formatting.');
        return text; // Fallback to raw text if parsing fails
      }
    } catch (error) {
      logger.error('[OrpionService] Gemini API Error:', error);
      throw new Error('Failed to generate neural summary.');
    }
  }
}

export default new OrpionService();
