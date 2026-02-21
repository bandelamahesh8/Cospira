import { ApiService } from './api';

class AIMemoryService extends ApiService {
    /**
     * Get AI memories for a room
     * @param {string} roomId 
     * @param {number} limit 
     */
    async getMemories(roomId, limit = 20) {
        try {
            return await this.get('/ai/memory/query', { roomId, limit });
        } catch (error) {
            console.error('[AIMemoryService] Failed to fetch memories:', error);
            return [];
        }
    }

    /**
     * Get memories filtered by type
     * @param {string} roomId 
     * @param {string} eventType 
     */
    async getMemoriesByType(roomId, eventType) {
        try {
            return await this.get('/ai/memory/query', { roomId, eventType });
        } catch (error) {
            console.error(`[AIMemoryService] Failed to fetch ${eventType} memories:`, error);
            return [];
        }
    }
}

export const aiMemoryService = new AIMemoryService();
