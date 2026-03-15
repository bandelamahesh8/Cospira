import express from 'express';
import logger from '../../shared/logger.js';

const router = express.Router();

/**
 * POST /api/tournaments/sync
 * Sync tournament data (stub)
 */
router.post('/sync', async (req, res) => {
    try {
        const { lastSync } = req.body;
        logger.info(`[TournamentAPI] Sync request since ${lastSync}`);
        
        // Return empty mock data for now
        res.json({
            tournaments: [],
            matches: [],
            participations: []
        });
    } catch (error) {
        logger.error('[TournamentAPI] Sync error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/tournaments
 */
router.get('/', (req, res) => {
    res.json([]);
});

/**
 * POST /api/tournaments
 */
router.post('/', (req, res) => {
    res.status(501).json({ error: 'Not implemented' });
});

/**
 * GET /api/tournaments/:id
 */
router.get('/:id', (req, res) => {
    res.status(404).json({ error: 'Tournament not found' });
});

export default router;
