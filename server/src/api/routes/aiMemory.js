import express from 'express';
import aiMemoryService from '../services/ai/AIMemoryService.js';
import logger from '../../shared/logger.js';

const router = express.Router();

/**
 * @route GET /api/ai/memory/query
 * @desc Get AI memories for a room
 */
router.get('/query', async (req, res) => {
    const { roomId, limit, eventType } = req.query;

    if (!roomId) {
        return res.status(400).json({ error: 'roomId is required' });
    }

    try {
        const memories = await aiMemoryService.queryMemories(roomId, {
            limit: limit ? parseInt(limit) : 50,
            eventType
        });
        res.json(memories);
    } catch (error) {
        logger.error('[AIMemoryRoutes] Query failed:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
