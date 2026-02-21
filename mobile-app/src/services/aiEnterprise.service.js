import { ApiService } from './api';

class AIEnterpriseService extends ApiService {
    /**
     * Get organization-wide stats
     */
    async getOrgStats(orgId, roomIds = []) {
        try {
            const query = roomIds.length > 0 ? `?roomIds=${roomIds.join(',')}` : '';
            return await this.get(`/ai/enterprise/stats/${orgId}${query}`);
        } catch (error) {
            console.error('[AIEnterpriseService] Failed to fetch org stats:', error);
            return null;
        }
    }

    /**
     * Get org audit logs and policies
     */
    async getAudit(orgId) {
        try {
            return await this.get(`/ai/enterprise/audit/${orgId}`);
        } catch (error) {
            console.error('[AIEnterpriseService] Failed to fetch audit:', error);
            return { policies: [], logs: [] };
        }
    }

    /**
     * Update an Org policy
     */
    async updatePolicy(orgId, policy) {
        try {
            return await this.post(`/ai/enterprise/policy/${orgId}`, policy);
        } catch (error) {
            console.error('[AIEnterpriseService] Failed to update policy:', error);
            return null;
        }
    }
}

export const aiEnterpriseService = new AIEnterpriseService();
