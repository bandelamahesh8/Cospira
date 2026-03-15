import { EventEmitter } from 'events';
import logger from '../../../shared/logger.js';

class AgentBus extends EventEmitter {
    constructor() {
        super();
        this.logs = [];
        this.maxLogs = 50;
    }

    /**
     * Broadcast a message to all agents
     * @param {string} agentId 
     * @param {string} topic 
     * @param {Object} payload 
     */
    broadcast(agentId, topic, payload) {
        const message = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2),
            timestamp: new Date().toISOString(),
            from: agentId,
            topic,
            payload
        };

        this.logs.unshift(message);
        if (this.logs.length > this.maxLogs) {
            this.logs.pop();
        }

        logger.info(`[AgentBus] ${agentId} -> ${topic}: ${JSON.stringify(payload).substring(0, 50)}...`);
        this.emit(topic, message);
        this.emit('any', message); // Universal listener
    }

    getLogs() {
        return this.logs;
    }

    clearLogs() {
        this.logs = [];
    }
}

export default new AgentBus();
