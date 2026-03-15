import express from 'express';
import twinService from '../services/ai/TwinService.js';

const router = express.Router();

/**
 * @route GET /api/ai/twin/:roomId
 * @desc Get the digital twin status
 */
router.get('/:roomId', (req, res) => {
    const { roomId } = req.params;
    const twin = twinService.getTwin(roomId);
    
    if (!twin) {
        // Mock a twin for now if none exists
        return res.json(twinService.createTwin(roomId, {
            personality: 'Tactical',
            securityLevel: 'High',
            activeModules: ['Observer', 'Analyzer']
        }));
    }
    
    res.json(twin);
});

/**
 * @route POST /api/ai/twin/:roomId/sync
 * @desc Manual resync of the twin
 */
router.post('/:roomId/sync', (req, res) => {
    const { roomId } = req.params;
    const { state } = req.body;
    res.json(twinService.syncState(roomId, state));
});

export default router;
