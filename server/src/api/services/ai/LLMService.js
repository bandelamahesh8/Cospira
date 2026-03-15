import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from '../../logger.js';

class LLMService {
  constructor() {
    this.primaryModel = null;
    this.secondaryModel = null;
    this.secondaryKey = process.env.GEMINI_SECONDARY_API_KEY || process.env.GEMINI_API_KEY;
    this.init();
  }

  init() {
    const config20 = {
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        maxOutputTokens: 2048,
      }
    };

    const config15 = {
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        maxOutputTokens: 2048,
      }
    };

    // 1. Initialize Primary Model (Try 2.0, fallback to 1.5 if 404/failure)
    if (process.env.GEMINI_API_KEY) {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.primaryModel = genAI.getGenerativeModel(config20);
        this.primaryModel15 = genAI.getGenerativeModel(config15);
        logger.info('[LLMService] Primary Gemini models (2.0/1.5) initialized.');
      } catch (err) {
        logger.error('[LLMService] Primary Gemini init failed:', err.message);
      }
    }

    // 2. Initialize Secondary Model (Fallback)
    try {
      const genAISecondary = new GoogleGenerativeAI(this.secondaryKey);
      this.secondaryModel = genAISecondary.getGenerativeModel(config20);
      this.secondaryModel15 = genAISecondary.getGenerativeModel(config15);
      logger.info('[LLMService] Secondary fallback Gemini models initialized.');
    } catch (err) {
      logger.error('[LLMService] Secondary Gemini init failed:', err.message);
    }
  }

  async generateMeetingSummary(transcripts) {
    if (!transcripts || transcripts.length === 0) {
      return { summary: "No content to summarize.", actionItems: [] };
    }

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
      const responseText = await this.generateContent(prompt);
      
      let cleanedText = responseText.trim();
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
      logger.error('[LLMService] Meeting Summary failed:', error.message);
      throw error;
    }
  }

  async generateContent(prompt, retryCount = 0) {
    const MAX_RETRIES = 2;
    const INITIAL_BACKOFF = 1000; // 1 second

    if (!this.primaryModel && !this.secondaryModel) {
      this.init();
      if (!this.primaryModel && !this.secondaryModel) throw new Error('LLM Service not initialized');
    }

    try {
      // Try primary model if available
      if (this.primaryModel) {
        const result = await this.primaryModel.generateContent(prompt);
        const response = await result.response;
        return response.text().trim();
      } else if (this.secondaryModel) {
        // Safe fallback if primary not configured
        const result = await this.secondaryModel.generateContent(prompt);
        const response = await result.response;
        return response.text().trim();
      }
    } catch (error) {
      const errorMsg = error.message || '';
      const isQuotaError = errorMsg.includes('429') || errorMsg.includes('Quota exceeded');
      const isModelError = errorMsg.includes('404') || errorMsg.includes('model not found');

      // 1. Handle Quota/Rate Limit (429) - Retry with Backoff
      if (isQuotaError && retryCount < MAX_RETRIES) {
        const delay = INITIAL_BACKOFF * Math.pow(2, retryCount);
        logger.warn(`[LLMService] Rate limited (429). Retrying in ${delay}ms... (Attempt ${retryCount + 1}/${MAX_RETRIES})`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // If primary failed, try secondary if it exists, otherwise retry primary
        if (this.secondaryModel && retryCount === 0) {
          logger.info('[LLMService] Switching to secondary key for retry...');
          try {
            const result = await this.secondaryModel.generateContent(prompt);
            const response = await result.response;
            return response.text().trim();
          } catch (secondaryError) {
             // If secondary also fails with 429, continue to retry loop
             if (secondaryError.message?.includes('429')) {
                return this.generateContent(prompt, retryCount + 1);
             }
             throw secondaryError;
          }
        }
        
        return this.generateContent(prompt, retryCount + 1);
      }

      // 2. Handle invalid model (404) - re-init or fail gracefully
      if (isModelError && !retryCount) {
        logger.warn('[LLMService] Model 2.0-flash not found. Falling back to 1.5-flash...');
        this.primaryModel = this.primaryModel15;
        this.secondaryModel = this.secondaryModel15;
        return this.generateContent(prompt, 0); // Retry once with new model
      }

      logger.error('[LLMService] Generation failed after retries:', errorMsg);
      throw error;
    }
  }
}

export default new LLMService();
