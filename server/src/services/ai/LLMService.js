
import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from '../../logger.js';

class LLMService {
  constructor() {
    this.genAI = null;
    this.model = null;
    this.init();
  }

  init() {
    if (process.env.GEMINI_API_KEY) {
      this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      this.model = this.genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 2048,
        }
      });
      logger.info('[LLMService] Initialized with Gemini API Key');
    } else {
      logger.warn('[LLMService] GEMINI_API_KEY missing. Auto-summary will fail.');
    }
  }

  /**
   * Generates a summary from a list of transcript objects.
   * @param {Array<{userName: string, text: string, timestamp: Date}>} transcripts 
   * @returns {Promise<{summary: string, actionItems: string[]}>}
   */
  async generateMeetingSummary(transcripts) {
    if (!this.model) {
      // Try re-init in case key was added late (e.g. via .env reload)
      this.init();
      if (!this.model) {
        throw new Error('Gemini Service not initialized');
      }
    }

    if (!transcripts || transcripts.length === 0) {
      return { summary: "No content to summarize.", actionItems: [] };
    }

    // Format transcript for prompt
    const formattedText = transcripts
      .map(t => `[${t.userName}]: ${t.text}`)
      .join('\n');

    const prompt = `
    You are an AI Meeting Assistant.
    Analyze the following meeting transcript and provide:
    1. A concise summary of the discussion (paragraph format).
    2. A list of clear Action Items (if any), assigning them to specific people if mentioned.
    
    Transcript:
    ${formattedText}
    
    Return ONLY valid JSON in this exact format (no markdown, no code blocks):
    {
      "summary": "...",
      "actionItems": ["Task 1", "Task 2"]
    }
    `;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Clean up the response - remove markdown code blocks if present
      let cleanedText = text.trim();
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/```\n?/g, '');
      }
      
      const parsed = JSON.parse(cleanedText);

      return {
        summary: parsed.summary || "Summary generation failed.",
        actionItems: parsed.actionItems || []
      };

    } catch (error) {
      logger.error('[LLMService] Generation failed:', error);
      throw error;
    }
  }

  /**
   * Generic content generation
   * @param {string} prompt 
   * @returns {Promise<string>}
   */
  async generateContent(prompt) {
    if (!this.model) {
      this.init();
      if (!this.model) throw new Error('LLM Service not initialized');
    }

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text().trim();
    } catch (error) {
      logger.error('[LLMService] Generic generation failed:', error);
      throw error;
    }
  }
}

export default new LLMService();
