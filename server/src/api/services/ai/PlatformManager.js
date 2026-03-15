import logger from '../../../shared/logger.js';

class PlatformManager {
    constructor() {
        this.activeSessions = new Map(); // userId -> [{ platform, lastActive, capabilities }]
    }

    /**
     * Register or update a platform session
     */
    registerSession(userId, platform, capabilities = {}) {
        const sessions = this.activeSessions.get(userId) || [];
        const existingSession = sessions.find(s => s.platform === platform);

        if (existingSession) {
            existingSession.lastActive = new Date().toISOString();
            existingSession.capabilities = capabilities;
        } else {
            sessions.push({
                platform,
                lastActive: new Date().toISOString(),
                capabilities
            });
        }

        this.activeSessions.set(userId, sessions);
        logger.info(`[PlatformManager] Updated ${platform} session for user ${userId}`);
    }

    /**
     * Get active platforms for a user
     */
    getSessions(userId) {
        return this.activeSessions.get(userId) || [];
    }

    /**
     * Determine best platform for deep processing
     */
    getPrimaryPlatform(userId) {
        const sessions = this.getSessions(userId);
        if (sessions.length === 0) return null;

        // Prefer DESKTOP > WEB > MOBILE for processing power
        const priority = ['DESKTOP', 'WEB', 'MOBILE'];
        for (const p of priority) {
            const found = sessions.find(s => s.platform === p);
            if (found) return found;
        }
        return sessions[0];
    }
}

export default new PlatformManager();
