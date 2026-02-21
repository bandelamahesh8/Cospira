import { ApiService } from './api';

class AIPluginsService extends ApiService {
    /**
     * Get all plugins
     */
    async getPlugins() {
        try {
            return await this.get('/ai/plugins/list');
        } catch (error) {
            console.error('[AIPluginsService] Failed to fetch plugins:', error);
            return { active: [], marketplace: [] };
        }
    }

    /**
     * Toggle plugin status
     */
    async togglePlugin(pluginId, action) {
        try {
            return await this.post('/ai/plugins/toggle', { pluginId, action });
        } catch (error) {
            console.error('[AIPluginsService] Failed to toggle plugin:', error);
            return null;
        }
    }
}

export const aiPluginsService = new AIPluginsService();
