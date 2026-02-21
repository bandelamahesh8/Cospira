import { ApiService } from './api';

class AIConflictService extends ApiService {
    /**
     * Get recent conflicts
     */
    async getConflicts() {
        try {
            return await this.get('/ai/conflicts');
        } catch (error) {
            console.error('[AIConflictService] Failed to fetch conflicts:', error);
            return [];
        }
    }
}

export const aiConflictService = new AIConflictService();
