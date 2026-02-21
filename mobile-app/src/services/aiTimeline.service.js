import { ApiService } from './api';

class AITimelineService extends ApiService {
    /**
     * Get unified timeline
     * @param {string} roomId 
     * @param {Object} params { limit, category }
     */
    async getTimeline(roomId, params = {}) {
        try {
            return await this.get(`/ai/timeline/${roomId}`, params);
        } catch (error) {
            console.error('[AITimelineService] Failed to fetch timeline:', error);
            return [];
        }
    }
}

export const aiTimelineService = new AITimelineService();
