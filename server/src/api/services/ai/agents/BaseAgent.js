import agentBus from '../AgentBus.js';
import logger from '../../../../shared/logger.js';

/**
 * Base class for all Neural Agents
 */
class BaseAgent {
    constructor(id, name, description) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.status = 'OFFLINE'; // OFFLINE, IDLE, THINKING, ACTIVE
        this.lastAction = null;
        this.startTime = null;
        this.metadata = {};
    }

    async init() {
        this.status = 'IDLE';
        this.startTime = new Date();
        logger.info(`[Agent:${this.name}] Initialized`);
    }

    async run(data) {
        this.status = 'THINKING';
        // To be implemented by subclasses
        return null;
    }

    async stop() {
        this.status = 'OFFLINE';
        logger.info(`[Agent:${this.name}] Stopped`);
    }

    getStatus() {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            status: this.status,
            lastAction: this.lastAction,
            uptime: this.startTime ? new Date() - this.startTime : 0,
            metadata: this.metadata
        };
    }

    logAction(action) {
        this.lastAction = action;
        logger.info(`[Agent:${this.name}] ${action}`);
    }

    broadcast(topic, payload) {
        agentBus.broadcast(this.id, topic, payload);
    }

    subscribe(topic, callback) {
        agentBus.on(topic, (msg) => {
            if (msg.from !== this.id) {
                callback(msg);
            }
        });
    }
}

export default BaseAgent;
