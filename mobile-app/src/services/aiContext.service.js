import { ApiService } from './api';

class AIContextService extends ApiService {
    /**
     * Get context inference for a room
     * @param {string} roomId 
     */
    async getContext(roomId) {
        try {
            return await this.get(`/ai/context/${roomId}`);
        } catch (error) {
            console.error('[AIContextService] Failed to fetch context:', error);
            return null;
        }
    }
}

export const aiContextService = new AIContextService();
