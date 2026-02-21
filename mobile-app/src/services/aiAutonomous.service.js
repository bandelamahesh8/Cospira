import { ApiService } from './api';

class AIAutonomousService extends ApiService {
    /**
     * Start a new autonomous goal
     */
    async launchGoal(goalDescription, roomId) {
        try {
            return await this.post('/ai/autonomous/goal', { goal: goalDescription, roomId });
        } catch (error) {
            console.error('[AIAutonomousService] Launch failed:', error);
            return null;
        }
    }

    /**
     * Get goal progress
     */
    async getGoalStatus(goalId) {
        try {
            return await this.get(`/ai/autonomous/status/${goalId}`);
        } catch (error) {
            console.error('[AIAutonomousService] Status fetch failed:', error);
            return null;
        }
    }

    /**
     * Stop a goal
     */
    async stopGoal(goalId) {
        try {
            return await this.delete(`/ai/autonomous/stop/${goalId}`);
        } catch (error) {
            console.error('[AIAutonomousService] Stop failed:', error);
            return null;
        }
    }
}

export const aiAutonomousService = new AIAutonomousService();
