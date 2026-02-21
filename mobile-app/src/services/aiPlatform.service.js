import { ApiService } from './api';

class AIPlatformService extends ApiService {
    /**
     * Get cross-platform status
     */
    async getStatus(userId) {
        try {
            return await this.get(`/ai/platform/status/${userId}`);
        } catch (error) {
            console.error('[AIPlatformService] Failed to fetch platform status:', error);
            return { sessions: [] };
        }
    }

    /**
     * Register current platform
     */
    async registerPlatform(userId, platform, capabilities = {}) {
        try {
            return await this.post(`/ai/platform/register/${userId}`, { platform, capabilities });
        } catch (error) {
            console.error('[AIPlatformService] Failed to register platform:', error);
            return null;
        }
    }

    /**
     * Trigger a manual sync
     */
    async syncState(userId, state) {
        try {
            return await this.post(`/ai/platform/sync/${userId}`, state);
        } catch (error) {
            console.error('[AIPlatformService] Failed to sync state:', error);
            return null;
        }
    }
}

export const aiPlatformService = new AIPlatformService();
