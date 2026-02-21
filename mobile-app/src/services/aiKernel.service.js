import { ApiService } from './api';

class AIKernelService extends ApiService {
    /**
     * Get system kernel status
     */
    async getStatus() {
        try {
            return await this.get('/ai/kernel/status');
        } catch (error) {
            console.error('[AIKernelService] Failed to fetch kernel status:', error);
            return null;
        }
    }
}

export const aiKernelService = new AIKernelService();
