import trustService from './TrustService.js';
import conflictDetector from './ConflictDetector.js';
import agentManager from './AgentManager.js';
import aiPersonalityService from './PersonalityService.js';
import logger from '../../../shared/logger.js';

class OptimizationEngine {
    constructor() {
        this.settings = {
            autoHeal: false,
            thresholds: {
                trustCollapse: 40,
                conflictLimit: 5
            }
        };
        this.activeRecommendations = [];
    }

    /**
     * Analyze system health and generate optimizations
     * @param {string} roomId 
     */
    async analyzeAndOptimize(roomId) {
        const recommendations = [];
        const trustProfile = trustService.getTrustProfile(roomId);
        const conflicts = conflictDetector.getConflicts().filter(c => c.roomId === roomId);

        // 1. Analyze Trust
        if (trustProfile && trustProfile.trust.score < this.settings.thresholds.trustCollapse) {
            recommendations.push({
                type: 'PERSONALITY_SHIFT',
                priority: 'CRITICAL',
                title: 'Drastic Trust Decline Detected',
                description: 'AI trust is dangerously low. Switching to "Friendly" personality recommended to rebuild rapport.',
                action: { type: 'CHANGE_PERSONALITY', target: 'friendly' }
            });
        }

        // 2. Analyze Conflicts
        if (conflicts.length > this.settings.thresholds.conflictLimit) {
            recommendations.push({
                type: 'CONSENSUS_TIGHTENING',
                priority: 'HIGH',
                title: 'High Human-AI Divergence',
                description: 'Frequent overrides detected. Tightening agent consensus requirements to increase recommendation reliability.',
                action: { type: 'ADJUST_CONSENSUS', target: 'strict' }
            });
        }

        this.activeRecommendations = recommendations;

        // Autonomous Auto-Heal
        if (this.settings.autoHeal && recommendations.length > 0) {
            for (const rec of recommendations) {
                if (rec.priority === 'CRITICAL') {
                    await this.applyOptimization(roomId, rec);
                }
            }
        }

        return recommendations;
    }

    async applyOptimization(roomId, rec) {
        logger.info(`[OptimizationEngine] Applying autonomous optimization: ${rec.title}`);
        
        switch (rec.action.type) {
            case 'CHANGE_PERSONALITY':
                await aiPersonalityService.setCurrentPersonality(rec.action.target);
                break;
            case 'ADJUST_CONSENSUS':
                // logic for agentManager adjustment
                break;
        }

        // Remove applied rec
        this.activeRecommendations = this.activeRecommendations.filter(r => r !== rec);
    }

    getSettings() { return this.settings; }
    updateSettings(newSettings) { this.settings = { ...this.settings, ...newSettings }; }
    getRecommendations() { return this.activeRecommendations; }
}

export default new OptimizationEngine();
