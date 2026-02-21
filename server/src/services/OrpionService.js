
import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from '../logger.js';

class OrpionService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    if (!this.apiKey) {
      logger.warn('[OrpionService] GEMINI_API_KEY not found in environment.');
    } else {
      this.genAI = new GoogleGenerativeAI(this.apiKey);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
    }
  }

  /**
   * Generates a structured summary for a conversation using Gemini
   * @param {string} conversationText - The full transcript of the conversation
   * @returns {Promise<string>} - The generated summary in markdown format
   */
  async generateSummary(conversationText) {
    if (!this.model) {
      throw new Error('Orpion AI is not configured (Missing API Key).');
    }

    if (!conversationText || conversationText.trim().length < 50) {
      throw new Error('Not enough conversation context to analyze.');
    }

    const prompt = `
    You are ORPION, an AI meeting intelligence engine.

    Analyze the following conversation and produce a structured report using exactly these headers:

    ## 🧠 Ultra-Short Summary
    (2 lines maximum capturing the essence)

    ## 📝 Detailed Summary
    (A comprehensive overview of what was discussed)

    ## 🔑 Key Topics
    (Bullet points of main subjects)

    ## ✅ Decisions Made
    (Bullet points of agreed outcomes, if any)

    ## 🚀 Action Items
    (Bullet points of tasks assigned, if any)

    ## 💡 Important Insights
    (Any smart observations or neural patterns detected)

    ---
    Conversation:
    ${conversationText}
    `;

    try {
      logger.info('[OrpionService] Sending request to Gemini...');
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      logger.info('[OrpionService] Analysis complete.');
      return text;
    } catch (error) {
      logger.error('[OrpionService] Gemini API Error:', error);
      throw new Error('Failed to generate neural summary.');
    }
  }
}

export default new OrpionService();
