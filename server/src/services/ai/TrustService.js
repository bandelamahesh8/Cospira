import conflictDetector from './ConflictDetector.js';
import logger from '../../logger.js';

class TrustService {
    constructor() {
        this.roomTrustScores = new Map(); // roomId -> { score, trend, lastUpdate }
    }

    /**
     * Calculate trust score for a room based on AI-Human alignment
     * @param {string} roomId 
     */
    calculateTrustScore(roomId) {
        const conflicts = conflictDetector.getConflicts();
        // For a basic MVP, we look at the last 10 suggestions/actions
        // In a real system, this would query a database of historical actions
        
        const totalEvents = 10; // Baseline
        const conflictCount = conflicts.length;
        
        // 100% start, -10% per recent conflict
        let score = Math.max(0, 100 - (conflictCount * 10));
        
        const previous = this.roomTrustScores.get(roomId);
        const trend = previous ? (score > previous.score ? 'UP' : score < previous.score ? 'DOWN' : 'STABLE') : 'STABLE';

        const trustData = {
            trust: {
                score,
                trend,
                metrics: {
                    alignmentRate: (100 - (conflictCount * 10)) / 100,
                    conflictDensity: conflictCount / totalEvents
                }
            },
            risk: {
                score: conflictCount * 5, // Mock risk score
                level: conflictCount > 5 ? 'HIGH' : 'LOW'
            },
            lastUpdate: new Date().toISOString()
        };

        this.roomTrustScores.set(roomId, trustData);
        logger.info(`[TrustService] Room ${roomId} trust profile updated: ${score}%`);
        
        return trustData;
    }

    getTrustProfile(roomId) {
        return this.roomTrustScores.get(roomId) || this.calculateTrustScore(roomId);
    }
}

export default new TrustService();
