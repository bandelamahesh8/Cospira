import { ApiService } from './api';

class AISimulationService extends ApiService {
    /**
     * Get simulation templates
     */
    async getTemplates() {
        try {
            return await this.get('/ai/simulation/templates');
        } catch (error) {
            // Silently fail - this is an optional feature not yet implemented
            return [];
        }
    }

    /**
     * Run a simulation
     */
    async runSimulation(roomId, templateId) {
        try {
            return await this.post(`/ai/simulation/run/${roomId}`, { templateId });
        } catch (error) {
            console.error('[AISimulationService] Failed to run simulation:', error);
            return null;
        }
    }

    /**
     * Get simulation history
     */
    async getHistory(roomId) {
        try {
            return await this.get(`/ai/simulation/history/${roomId}`);
        } catch (error) {
            // Silently fail - this is an optional feature not yet implemented
            return [];
        }
    }
}

export const aiSimulationService = new AISimulationService();
