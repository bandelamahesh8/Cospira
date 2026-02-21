import { ApiService } from './api';

class AIAgentService extends ApiService {
    /**
     * Get statuses of all agents
     */
    async getAgents() {
        try {
            return await this.get('/ai/agents');
        } catch (error) {
            console.error('[AIAgentService] Failed to fetch agents:', error);
            return [];
        }
    }

    /**
     * Reboot a specific agent
     * @param {string} id 
     */
    async rebootAgent(id) {
        try {
            return await this.post(`/ai/agents/${id}/reboot`);
        } catch (error) {
            console.error('[AIAgentService] Failed to reboot agent:', error);
            return null;
        }
    }

    /**
     * Get inter-agent communication logs
     */
    async getAgentLogs() {
        try {
            return await this.get('/ai/agents/logs');
        } catch (error) {
            console.error('[AIAgentService] Failed to fetch agent logs:', error);
            return [];
        }
    }
}

export const aiAgentService = new AIAgentService();
