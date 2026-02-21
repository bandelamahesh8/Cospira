import { ApiService } from './api';

class AIOSService extends ApiService {
    /**
     * Get system pulse
     */
    async getPulse() {
        try {
            return await this.get('/ai/os/status');
        } catch (error) {
            console.error('[AIOSService] Pulse fetch failed:', error);
            return null;
        }
    }

    /**
     * Restart the OS
     */
    async restart() {
        try {
            return await this.post('/ai/os/restart');
        } catch (error) {
            console.error('[AIOSService] Restart failed:', error);
            return null;
        }
    }

    /**
     * Get detailed stats
     */
    async getStats() {
        try {
            return await this.get('/ai/os/stats');
        } catch (error) {
            console.error('[AIOSService] Stats fetch failed:', error);
            return null;
        }
    }
}

export const aiOSService = new AIOSService();
