import trustService from './TrustService.js';
import logger from '../../../shared/logger.js';

class RiskBehaviorModel {
    /**
     * Analyze risk level based on trust and recent actions
     * @param {string} roomId 
     */
    analyzeRisk(roomId) {
        const profile = trustService.getTrustProfile(roomId);
        const score = profile.trust.score;
        
        let level = 'LOW';
        let factors = [];

        if (score < 50) {
            level = 'CRITICAL';
            factors.push('High override frequency detected');
            factors.push('Low human-AI synergy');
        } else if (score < 70) {
            level = 'HIGH';
            factors.push('Manual overrides exceeding safety thresholds');
        } else if (score < 90) {
            level = 'MODERATE';
            factors.push('Occasional decision divergence');
        }

        const riskProfile = {
            level,
            score: 100 - score, // Risk is inverse of trust
            factors,
            timestamp: new Date().toISOString()
        };

        logger.info(`[RiskModel] Room ${roomId} Risk Level: ${level}`);
        
        return riskProfile;
    }
}

export default new RiskBehaviorModel();
