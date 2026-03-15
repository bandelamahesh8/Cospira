import logger from '../../../shared/logger.js';
import goalEngine from './AutonomousGoalEngine.js';
import agentManager from './AgentManager.js';

class TaskOrchestrator {
    constructor() {
        this.activeLoops = new Map(); // goalId -> Interval
    }

    /**
     * Start the autonomous execution loop for a goal
     */
    async startExecution(goalId, roomId) {
        const goal = goalEngine.getGoal(goalId);
        if (!goal) throw new Error('Goal not found');

        logger.info(`[TaskOrchestrator] Starting execution for Goal: ${goal.description}`);
        goal.status = 'EXECUTING';

        const loop = setInterval(async () => {
            await this.processNextStep(goalId, roomId);
        }, 3000); // 3-second heartbeat for execution steps

        this.activeLoops.set(goalId, loop);
    }

    async processNextStep(goalId, roomId) {
        const goal = goalEngine.getGoal(goalId);
        const nextStep = goal.steps.find(s => s.status === 'PENDING' || s.status === 'IN_PROGRESS');

        if (!nextStep) {
            logger.info(`[TaskOrchestrator] Goal ${goalId} COMPLETED.`);
            goal.status = 'COMPLETED';
            this.stopExecution(goalId);
            return;
        }

        if (nextStep.status === 'PENDING') {
            nextStep.status = 'IN_PROGRESS';
            nextStep.assignedAgent = this.assignAgent(nextStep.title);
            logger.info(`[TaskOrchestrator] Step "${nextStep.title}" started by agent: ${nextStep.assignedAgent}`);
        }

        // Simulate progress
        nextStep.progress += 25;
        if (nextStep.progress >= 100) {
            nextStep.status = 'SUCCESS';
            logger.info(`[TaskOrchestrator] Step "${nextStep.title}" SUCCESS.`);
        }
    }

    assignAgent(stepTitle) {
        // Logic to select the best agent based on task type
        const agents = agentManager.getAgents();
        if (stepTitle.includes('Scan') || stepTitle.includes('Check')) return 'ObserverAgent';
        if (stepTitle.includes('Analyze') || stepTitle.includes('Verify')) return 'AnalyzerAgent';
        return 'PredictorAgent';
    }

    stopExecution(goalId) {
        const loop = this.activeLoops.get(goalId);
        if (loop) {
            clearInterval(loop);
            this.activeLoops.delete(goalId);
            const goal = goalEngine.getGoal(goalId);
            if (goal && goal.status === 'EXECUTING') goal.status = 'HALTED';
            logger.info(`[TaskOrchestrator] Halted execution for ${goalId}`);
        }
    }
}

export default new TaskOrchestrator();
