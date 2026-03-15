import logger from '../../logger.js';

class AgentManager {
    constructor() {
        this.agents = new Map();
        this.isRunning = false;
    }

    registerAgent(agent) {
        this.agents.set(agent.id, agent);
        logger.info(`[AgentManager] Registered: ${agent.name}`);
    }

    async startAll() {
        this.isRunning = true;
        for (const agent of this.agents.values()) {
            await agent.init();
        }
        logger.info(`[AgentManager] All agents online`);
    }

    async stopAll() {
        this.isRunning = false;
        for (const agent of this.agents.values()) {
            await agent.stop();
        }
    }

    getAgent(id) {
        return this.agents.get(id);
    }

    getAllStatuses() {
        return Array.from(this.agents.values()).map(a => a.getStatus());
    }

    async rebootAgent(id) {
        const agent = this.agents.get(id);
        if (agent) {
            await agent.stop();
            await agent.init();
            return true;
        }
        return false;
    }
}

export default new AgentManager();
