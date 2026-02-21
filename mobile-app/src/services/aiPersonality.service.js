import { ApiService } from './api';

class AIPersonalityService extends ApiService {
    /**
     * Get available personalities
     */
    async getPersonalities() {
        try {
            return await this.get('/ai/personality');
        } catch (error) {
            console.error('[AIPersonalityService] Failed to fetch personalities:', error);
            return null;
        }
    }

    /**
     * Switch personality
     * @param {string} id 
     */
    async setPersonality(id) {
        try {
            return await this.post('/ai/personality/set', { id });
        } catch (error) {
            console.error('[AIPersonalityService] Failed to set personality:', error);
            return null;
        }
    }
}

export const aiPersonalityService = new AIPersonalityService();
