import llmService from './LLMService.js';
import aiMemoryService from './AIMemoryService.js';
import personalityService from './PersonalityService.js';
import logger from '../../logger.js';

class ReasoningService {
    /**
     * Generate an explanation for a specific AI memory/decision
     * @param {string} memoryId 
     */
    async explainDecision(memoryId) {
        try {
            // 1. Fetch the memory entry and current personality
            const memory = await aiMemoryService.getMemoryById(memoryId);
            if (!memory) throw new Error('Memory not found');

            const personality = personalityService.getPersonality();

            // 2. Build reasoning prompt
            const prompt = `
            You are the Cospira AI OS Reasoning Engine. 
            Currently operating in ${personality.name} Personality mode.
            Tone: ${personality.tone}.
            Priorities: ${personality.priorities.join(', ')}.

            Explain the following system event/decision.
            
            Event Details:
            - Type: ${memory.event_type}
            - Action: ${memory.content.action || 'N/A'}
            - Reason: ${memory.content.reason || 'N/A'}
            - Target: ${memory.content.targetUser || 'System'}
            - Importance: ${memory.importance}/5
            
            Contextual Insight: ${memory.content.message || ''}
            
            Generated Explanation Goal:
            Provide a 2-3 sentence technical justification for WHY this action was necessary based on safety, performance, or user experience guidelines.

            Return ONLY valid JSON:
            {
                "explanation": "...",
                "confidence": 0.95,
                "logic_steps": ["Step 1", "Step 2"]
            }
            `;

            // 3. Use LLM to generate explanation
            const result = await llmService.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            
            // Clean and parse JSON
            let cleanedText = text.trim();
            if (cleanedText.startsWith('```json')) {
                cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
            }
            
            const parsed = JSON.parse(cleanedText);

            return {
                memoryId,
                ...parsed,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            logger.error('[ReasoningService] Failed to explain decision:', error.message);
            return {
                explanation: "Explanation unavailable due to system latency.",
                confidence: 0,
                logic_steps: ["Data retrieval", "LLM Analysis failed"]
            };
        }
    }
}

export default new ReasoningService();
