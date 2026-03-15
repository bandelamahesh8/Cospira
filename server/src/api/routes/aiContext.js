import express from 'express';
import contextInferenceService from '../services/ai/ContextInferenceService.js';
import logger from '../../shared/logger.js';

const router = express.Router();

/**
 * @route GET /api/ai/context/:roomId
 * @desc Get AI Context inference for a room
 */
router.get('/:roomId', async (req, res) => {
    const { roomId } = req.params;

    if (!roomId) {
        return res.status(400).json({ error: 'roomId is required' });
    }

    try {
        const context = await contextInferenceService.inferContext(roomId);
        res.json(context);
    } catch (error) {
        logger.error('[ContextRoutes] Inference failed:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
