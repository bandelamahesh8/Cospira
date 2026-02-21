import aiMemoryService from './AIMemoryService.js';
import trustService from './TrustService.js';
import conflictDetector from './ConflictDetector.js';
import logger from '../../logger.js';

class EnterpriseService {
    constructor() {
        this.orgMetrics = new Map(); // orgId -> { healthScore, totalConflicts, activeRooms }
    }

    /**
     * Aggregate health metrics for an entire organization
     * @param {string} orgId 
     * @param {Array<string>} roomIds 
     */
    async getOrgHealth(orgId, roomIds) {
        logger.info(`[EnterpriseService] Aggregating health for Org: ${orgId} across ${roomIds.length} rooms`);
        
        let totalTrust = 0;
        let totalConflicts = 0;
        let totalRisks = 0;
        let roomCount = 0;

        for (const roomId of roomIds) {
            const trustProfile = trustService.getTrustProfile(roomId);
            const conflicts = conflictDetector.getConflicts().filter(c => c.roomId === roomId);
            
            if (trustProfile) {
                totalTrust += trustProfile.trust.score;
                totalRisks += trustProfile.risk.score;
                totalConflicts += conflicts.length;
                roomCount++;
            }
        }

        const avgTrust = roomCount > 0 ? Math.round(totalTrust / roomCount) : 100;
        const avgRisk = roomCount > 0 ? Math.round(totalRisks / roomCount) : 0;
        
        const health = {
            orgId,
            healthScore: Math.max(0, avgTrust - (avgRisk * 0.5)),
            avgTrust,
            avgRisk,
            totalConflicts,
            activeRooms: roomCount,
            timestamp: new Date().toISOString()
        };

        this.orgMetrics.set(orgId, health);
        return health;
    }

    getLatestMetrics(orgId) {
        return this.orgMetrics.get(orgId);
    }
}

export default new EnterpriseService();
