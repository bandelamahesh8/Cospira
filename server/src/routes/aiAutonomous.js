import express from 'express';
import goalEngine from '../services/ai/AutonomousGoalEngine.js';
import orchestrator from '../services/ai/TaskOrchestrator.js';

const router = express.Router();

/**
 * @route POST /api/ai/autonomous/goal
 * @desc Submit a new autonomous objective
 */
router.post('/goal', async (req, res) => {
    try {
        const { goal, roomId } = req.body;
        const newGoal = await goalEngine.decomposeGoal(goal);
        
        // Auto-start execution
        await orchestrator.startExecution(newGoal.id, roomId);
        
        res.json({ success: true, goal: newGoal });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route GET /api/ai/autonomous/status/:goalId
 * @desc Get real-time progress of a goal
 */
router.get('/status/:goalId', (req, res) => {
    const goal = goalEngine.getGoal(req.params.goalId);
    if (!goal) return res.status(404).json({ error: 'Goal not found' });
    res.json(goal);
});

/**
 * @route DELETE /api/ai/autonomous/stop/:goalId
 * @desc Halt autonomous execution
 */
router.delete('/stop/:goalId', (req, res) => {
    orchestrator.stopExecution(req.params.goalId);
    res.json({ success: true });
});

export default router;
