import express from 'express';
import timelineAggregator from '../services/ai/TimelineAggregator.js';

const router = express.Router();

/**
 * @route GET /api/ai/timeline/:roomId
 * @desc Get consolidated intelligence timeline
 */
router.get('/:roomId', async (req, res) => {
    try {
        const { roomId } = req.params;
        const { limit, category } = req.query;
        
        const timeline = await timelineAggregator.getUnifiedTimeline(roomId, {
            limit: limit ? parseInt(limit) : 20,
            category: category || 'all'
        });
        
        res.json(timeline);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
