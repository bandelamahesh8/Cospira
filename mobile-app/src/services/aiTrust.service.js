import { ApiService } from './api';

class AITrustService extends ApiService {
    /**
     * Get trust and risk profile
     * @param {string} roomId 
     */
    async getTrustProfile(roomId) {
        try {
            return await this.get(`/ai/trust/${roomId}`);
        } catch (error) {
            console.error('[AITrustService] Failed to fetch trust profile:', error);
            return null;
        }
    }
}

export const aiTrustService = new AITrustService();
