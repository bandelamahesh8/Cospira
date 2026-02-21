import express from 'express';
import agentManager from '../services/ai/AgentManager.js';
import agentBus from '../services/ai/AgentBus.js';

const router = express.Router();

/**
 * @route GET /api/ai/agents
 * @desc Get status of all neural agents
 */
router.get('/', (req, res) => {
    res.json(agentManager.getAllStatuses());
});

/**
 * @route GET /api/ai/agents/logs
 * @desc Get inter-agent communication logs
 */
router.get('/logs', (req, res) => {
    res.json(agentBus.getLogs());
});

/**
 * @route POST /api/ai/agents/:id/reboot
 * @desc Reboot a specific agent
 */
router.post('/:id/reboot', async (req, res) => {
    const success = await agentManager.rebootAgent(req.params.id);
    if (success) {
        res.json({ success: true, message: `Agent ${req.params.id} rebooted` });
    } else {
        res.status(404).json({ error: 'Agent not found' });
    }
});

export default router;
