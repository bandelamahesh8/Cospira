import logger from '../../../shared/logger.js';

class TwinService {
    constructor() {
        this.twins = new Map(); // roomId -> { state, lastSync, driftScore }
    }

    /**
     * Create or update a digital twin for a room
     * @param {string} roomId 
     * @param {Object} liveState 
     */
    createTwin(roomId, liveState) {
        const twin = {
            id: `twin-${roomId}`,
            roomId: roomId,
            state: JSON.parse(JSON.stringify(liveState)), // Deep clone
            lastSync: new Date().toISOString(),
            driftScore: 0,
            status: 'STABLE'
        };

        this.twins.set(roomId, twin);
        logger.info(`[TwinService] Digital Twin created/updated for Room ${roomId}`);
        return twin;
    }

    /**
     * Update twin state and calculate drift
     * @param {string} roomId 
     * @param {Object} newState 
     */
    syncState(roomId, newState) {
        const twin = this.twins.get(roomId);
        if (!twin) return this.createTwin(roomId, newState);

        // Simple drift calculation: number of top-level key changes
        // In a real system, this would be a deep diff
        let changes = 0;
        for (const key in newState) {
            if (JSON.stringify(newState[key]) !== JSON.stringify(twin.state[key])) {
                changes++;
            }
        }

        twin.driftScore = changes;
        twin.state = JSON.parse(JSON.stringify(newState));
        twin.lastSync = new Date().toISOString();
        twin.status = changes > 5 ? 'CAUTION' : 'STABLE';

        return twin;
    }

    getTwin(roomId) {
        return this.twins.get(roomId);
    }
}

export default new TwinService();
