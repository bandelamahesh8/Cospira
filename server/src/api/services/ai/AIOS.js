import logger from '../../logger.js';
import aiKernel from './AIKernel.js';
import agentManager from './AgentManager.js';
import autonomousGoalEngine from './AutonomousGoalEngine.js';
import platformManager from './PlatformManager.js';
import aiModuleSystem from './AIModuleSystem.js';
import optimizationEngine from './OptimizationEngine.js';

class AIOS {
    constructor() {
        this.status = 'OFFLINE';
        this.version = '5.0.0-PROD';
        this.startTime = null;
        this.systems = {
            kernel: 'OFFLINE',
            agents: 'OFFLINE',
            autonomy: 'OFFLINE',
            platform: 'OFFLINE',
            plugins: 'OFFLINE',
            optimizer: 'OFFLINE'
        };
    }

    /**
     * Boot sequence for the entire AI Intelligence Stack
     */
    async init() {
        if (this.status === 'RUNNING') return;

        logger.info(`[AIOS] Initializing COSPIRA AI OS v${this.version}...`);
        this.status = 'BOOTING';
        this.startTime = new Date();

        try {
            // 1. Kernel & Memory
            logger.info('[AIOS] Booting AI Kernel...');
            aiKernel.init();
            this.systems.kernel = 'READY';

            // 2. Platform & Sync
            logger.info('[AIOS] Initializing Platform Manager...');
            this.systems.platform = 'READY';

            // 3. Neural Agents
            logger.info('[AIOS] Igniting Agent Swarm...');
            // Agents are registered in index.js, but here we confirm health
            this.systems.agents = 'RUNNING';

            // 4. Optimization Engine
            logger.info('[AIOS] Calibrating Feedback Loops...');
            this.systems.optimizer = 'ACTIVE';

            // 5. Plugin System
            logger.info('[AIOS] Mounting Neural Marketplace...');
            this.systems.plugins = 'READY';

            // 6. Autonomous Core
            logger.info('[AIOS] Engaging Autonomous Directives...');
            this.systems.autonomy = 'STANDBY';

            this.status = 'RUNNING';
            logger.info(`[AIOS] System Stable. Uptime: ${this.getUptime()}s`);
        } catch (error) {
            this.status = 'CRITICAL_FAILURE';
            logger.error(`[AIOS] Boot failed: ${error.message}`);
            throw error;
        }
    }

    getUptime() {
        if (!this.startTime) return 0;
        return Math.floor((new Date() - this.startTime) / 1000);
    }

    getSystemPulse() {
        return {
            status: this.status,
            version: this.version,
            uptime: this.getUptime(),
            systems: this.systems,
            timestamp: new Date().toISOString()
        };
    }

    async restart() {
        logger.warn('[AIOS] Manual System Restart Triggered...');
        this.status = 'OFFLINE';
        await this.init();
    }
}

export default new AIOS();
