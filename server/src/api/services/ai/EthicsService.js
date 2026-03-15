import agentBus from './AgentBus.js';
import logger from '../../../shared/logger.js';
import client from 'prom-client';

class EthicsService {
    constructor() {
        this.auditLogs = [];
        this.maxLogs = 50;
        this.systemHealth = 100; // 0-100
        this.lastHighConflict = null;

        // Prometheus Gauge for system health
        this.healthGauge = new client.Gauge({
            name: 'ethics_system_health',
            help: 'Current ethics system health score (0-100)'
        });
        this.healthGauge.set(this.systemHealth);

        // Monitor AgentBus for all actions
        agentBus.on('any', (msg) => this.audit(msg));
        agentBus.on('conflict_detected', (msg) => this.auditConflict(msg));

        // Start passive recovery timer
        this.recoveryInterval = setInterval(() => this.passiveRecovery(), 30 * 60 * 1000); // 30 minutes
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
        
        this.systemHealth = Math.max(10, this.systemHealth - penalty); // Minimum 10
        this.lastHighConflict = conflict.severity === 'HIGH' ? Date.now() : this.lastHighConflict;
        
        this.healthGauge.set(this.systemHealth);
        
        this.logAudit('WARNING', conflict.topic, `Human-AI divergence detected. Potential safety gap.`, 0.7);
        
        logger.warn(`[EthicsService] Health decreased to ${this.systemHealth}% due to conflict on ${conflict.topic}`);
    }

    passiveRecovery() {
        // Recover +2 if no HIGH conflicts in last 30 minutes
        if (this.lastHighConflict && (Date.now() - this.lastHighConflict) >= 30 * 60 * 1000) {
            this.systemHealth = Math.min(100, this.systemHealth + 2);
            this.healthGauge.set(this.systemHealth);
            logger.info(`[EthicsService] Passive recovery: health now ${this.systemHealth}%`);
        }
    }

    resetSession(roomId) {
        // Reset room-scoped ethics state on room end
        this.lastHighConflict = null;
        logger.info(`[EthicsService] Reset session state for room ${roomId}`);
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
