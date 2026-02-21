import { ApiService } from './api';

class AIOptimizeService extends ApiService {
    /**
     * Get recommendations and system settings
     */
    async getStatus(roomId) {
        try {
            return await this.get(`/ai/optimize/status/${roomId}`);
        } catch (error) {
            console.error('[AIOptimizeService] Failed to fetch status:', error);
            return { settings: { autoHeal: false }, recommendations: [] };
        }
    }

    /**
     * Apply a specific recommendation
     */
    async applyRecommendation(roomId, recommendation) {
        try {
            return await this.post(`/ai/optimize/apply/${roomId}`, { recommendation });
        } catch (error) {
            console.error('[AIOptimizeService] Failed to apply recommendation:', error);
            return null;
        }
    }

    /**
     * Update optimization settings
     */
    async updateSettings(settings) {
        try {
            return await this.post('/ai/optimize/settings', settings);
        } catch (error) {
            console.error('[AIOptimizeService] Failed to update settings:', error);
            return null;
        }
    }
}

export const aiOptimizeService = new AIOptimizeService();
