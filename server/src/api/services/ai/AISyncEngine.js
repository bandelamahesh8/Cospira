import platformManager from './PlatformManager.js';
import logger from '../../../shared/logger.js';

class AISyncEngine {
    constructor() {
        this.syncHistory = new Map(); // userId -> lastSyncTimestamp
    }

    /**
     * Synchronize AI state across platforms
     * @param {string} userId
     * @param {Object} state { personality, trust, twin }
     */
    async syncState(userId, state) {
        const sessions = platformManager.getSessions(userId);
        if (sessions.length < 2) {
            // No need to sync if only one platform is active
            return { success: true, message: 'Standalone session. No sync required.' };
        }

        logger.info(`[AISyncEngine] Syncing state for user ${userId} across ${sessions.length} platforms`);

        // Force a broadcast to all active sessions via whatever transport is active (WebSocket/PubSub)
        // For now, we log the intent and update local history
        this.syncHistory.set(userId, {
            timestamp: new Date().toISOString(),
            platforms: sessions.map(s => s.platform),
            stateSummary: Object.keys(state)
        });

        return {
            success: true,
            syncedPlatforms: sessions.map(s => s.platform),
            timestamp: new Date().toISOString()
        };
    }

    getSyncStatus(userId) {
        return this.syncHistory.get(userId);
    }
}

export default new AISyncEngine();
