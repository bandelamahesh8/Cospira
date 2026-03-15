import agentBus from './AgentBus.js';
import logger from '../../logger.js';

class ConflictDetector {
    constructor() {
        this.suggestions = new Map(); // topic -> { suggestion, timestamp, timeout }
        this.conflicts = [];
        this.maxConflicts = 50;

        // Listen for AI suggestions
        agentBus.on('recommendation', (msg) => this.trackSuggestion(msg));
        agentBus.on('consensus_final', (msg) => this.trackSuggestion(msg));
    }

    trackSuggestion(msg) {
        const { topic, result, recommendation } = msg.payload || msg;
        const suggestionValue = recommendation || result;

        this.suggestions.set(topic, {
            value: suggestionValue,
            timestamp: Date.now(),
            agentId: msg.from || 'system'
        });

        logger.info(`[ConflictDetector] Tracking suggestion for ${topic}: ${suggestionValue}`);

        // Suggestions expire after 5 minutes if no action is taken
        setTimeout(() => {
            this.suggestions.delete(topic);
        }, 5 * 60 * 1000);
    }

    /**
     * Check if a human action conflicts with an active AI suggestion
     * @param {string} topic 
     * @param {any} humanActionValue 
     */
    detect(topic, humanActionValue) {
        const suggestion = this.suggestions.get(topic);
        if (!suggestion) return null;

        let isConflict = false;
        
        // Basic conflict logic
        if (typeof suggestion.value === 'boolean' && typeof humanActionValue === 'boolean') {
            isConflict = suggestion.value !== humanActionValue;
        } else if (typeof suggestion.value === 'string' && typeof humanActionValue === 'string') {
            isConflict = suggestion.value.toLowerCase() !== humanActionValue.toLowerCase();
        }

        if (isConflict) {
            const conflict = {
                id: Date.now().toString(36),
                timestamp: new Date().toISOString(),
                topic,
                aiSuggested: suggestion.value,
                humanAction: humanActionValue,
                agentId: suggestion.agentId,
                severity: 'HIGH' // Default to high for now
            };

            this.conflicts.unshift(conflict);
            if (this.conflicts.length > this.maxConflicts) {
                this.conflicts.pop();
            }

            logger.warn(`[ConflictDetector] !!! CONFLICT DETECTED on ${topic} !!!`);
            agentBus.broadcast('system', 'conflict_detected', conflict);
            
            this.suggestions.delete(topic); // Clear suggestion after conflict
            return conflict;
        }

        // Action aligned with AI
        this.suggestions.delete(topic);
        return null;
    }

    getConflicts() {
        return this.conflicts;
    }
}

export default new ConflictDetector();
