import { ApiService } from './api';

class AIReasoningService extends ApiService {
    /**
     * Get AI explanation for a decision
     * @param {string} memoryId 
     */
    async explain(memoryId) {
        try {
            return await this.get(`/ai/reasoning/explain/${memoryId}`);
        } catch (error) {
            console.error('[AIReasoningService] Failed to fetch explanation:', error);
            return null;
        }
    }
}

export const aiReasoningService = new AIReasoningService();
