import aiMemoryService from './AIMemoryService.js';
import conflictDetector from './ConflictDetector.js';
import trustService from './TrustService.js';
import ethicsService from './EthicsService.js';

class TimelineAggregator {
    /**
     * Aggregate all intelligence events into a unified stream
     * @param {string} roomId 
     * @param {Object} options { limit, offset, category }
     */
    async getUnifiedTimeline(roomId, options = {}) {
        const { limit = 20, category = 'all' } = options;

        const events = [];

        // 1. Fetch Cognitive Memories
        if (category === 'all' || category === 'memory') {
            const memories = await aiMemoryService.getMemories(roomId, limit);
            memories.forEach(m => events.push({
                id: m.id || m._id,
                timestamp: m.timestamp,
                type: 'MEMORY',
                subType: m.type,
                title: m.insight || m.type.toUpperCase(),
                detail: m.detail || m.metadata,
                agent: m.metadata?.agentId || 'system'
            }));
        }

        // 2. Fetch Conflicts
        if (category === 'all' || category === 'conflict') {
            const conflicts = conflictDetector.getConflicts();
            conflicts.forEach(c => events.push({
                id: c.id,
                timestamp: c.timestamp,
                type: 'CONFLICT',
                subType: 'override',
                title: `OVERRIDE: ${c.topic.toUpperCase()}`,
                detail: `AI suggested ${c.aiSuggested}, but human chose ${c.humanAction}`,
                severity: c.severity,
                agent: c.agentId
            }));
        }

        // 3. Fetch Ethical Audits
        if (category === 'all' || category === 'ethics') {
            const auditLogs = ethicsService.getLogs();
            auditLogs.forEach(a => events.push({
                id: a.id,
                timestamp: a.timestamp,
                type: 'ETHICS',
                subType: a.level,
                title: `ETHICAL AUDIT: ${a.category}`,
                detail: a.detail,
                alignmentScore: a.alignmentScore
            }));
        }

        // Sort by timestamp descending
        events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        return events.slice(0, limit);
    }
}

export default new TimelineAggregator();
