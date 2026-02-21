import agentBus from './AgentBus.js';
import logger from '../../logger.js';

class EthicsService {
    constructor() {
        this.auditLogs = [];
        this.maxLogs = 50;
        this.systemHealth = 100; // 0-100

        // Monitor AgentBus for all actions
        agentBus.on('any', (msg) => this.audit(msg));
        agentBus.on('conflict_detected', (msg) => this.auditConflict(msg));
    }

    audit(msg) {
        // Basic ethical check: Is the topic sensitive?
        const sensitiveTopics = ['security', 'access', 'privacy', 'lockdown'];
        if (sensitiveTopics.includes(msg.topic)) {
            this.logAudit('INFO', msg.topic, `Monitored sensitive action from ${msg.from}`, 1.0);
        }
    }

    auditConflict(msg) {
        // A conflict is mathematically an ethical divergence (Human vs AI)
        const conflict = msg.payload || msg;
        const penalty = conflict.severity === 'HIGH' ? 5 : 2;
        
        this.systemHealth = Math.max(0, this.systemHealth - penalty);
        this.logAudit('WARNING', conflict.topic, `Human-AI divergence detected. Potential safety gap.`, 0.7);
        
        logger.warn(`[EthicsService] Health decreased to ${this.systemHealth}% due to conflict on ${conflict.topic}`);
    }

    logAudit(level, category, detail, score) {
        const entry = {
            id: Date.now().toString(36),
            timestamp: new Date().toISOString(),
            level,
            category,
            detail,
            alignmentScore: score
        };

        this.auditLogs.unshift(entry);
        if (this.auditLogs.length > this.maxLogs) {
            this.auditLogs.pop();
        }
    }

    getHealth() {
        return {
            status: this.systemHealth > 80 ? 'OPTIMAL' : this.systemHealth > 50 ? 'CAUTION' : 'DANGER',
            score: this.systemHealth,
            timestamp: new Date().toISOString()
        };
    }

    getLogs() {
        return this.auditLogs;
    }
}

export default new EthicsService();
