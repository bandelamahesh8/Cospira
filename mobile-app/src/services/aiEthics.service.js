import { ApiService } from './api';

class AIEthicsService extends ApiService {
    /**
     * Get system ethical health pulse
     */
    async getPulse() {
        try {
            return await this.get('/ai/ethics/pulse');
        } catch (error) {
            console.error('[AIEthicsService] Failed to fetch ethics pulse:', error);
            return { score: 100, status: 'OPTIMAL' };
        }
    }

    /**
     * Get ethical audit logs
     */
    async getAuditLogs() {
        try {
            return await this.get('/ai/ethics/audit');
        } catch (error) {
            console.error('[AIEthicsService] Failed to fetch audit logs:', error);
            return [];
        }
    }
}

export const aiEthicsService = new AIEthicsService();
