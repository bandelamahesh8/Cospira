import express from 'express';
import reasoningService from '../services/ai/ReasoningService.js';
import logger from '../logger.js';

const router = express.Router();

/**
 * @route GET /api/ai/reasoning/explain/:memoryId
 * @desc Get AI explanation for a specific decision/event
 */
router.get('/explain/:memoryId', async (req, res) => {
    const { memoryId } = req.params;

    if (!memoryId) {
        return res.status(400).json({ error: 'memoryId is required' });
    }

    try {
        const result = await reasoningService.explainDecision(memoryId);
        res.json(result);
    } catch (error) {
        logger.error('[ReasoningRoutes] Explanation failed:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
