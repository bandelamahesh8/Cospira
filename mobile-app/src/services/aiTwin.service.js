import { ApiService } from './api';

class AITwinService extends ApiService {
    /**
     * Get digital twin status
     * @param {string} roomId 
     */
    async getTwin(roomId) {
        try {
            return await this.get(`/ai/twin/${roomId}`);
        } catch (error) {
            console.error('[AITwinService] Failed to fetch twin:', error);
            return null;
        }
    }

    /**
     * Resync twin
     */
    async syncTwin(roomId, state) {
        try {
            return await this.post(`/ai/twin/${roomId}/sync`, { state });
        } catch (error) {
            console.error('[AITwinService] Failed to sync twin:', error);
            return null;
        }
    }
}

export const aiTwinService = new AITwinService();
