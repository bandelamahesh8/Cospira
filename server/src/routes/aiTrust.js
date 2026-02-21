import express from 'express';
import trustService from '../services/ai/TrustService.js';
import riskModel from '../services/ai/RiskBehaviorModel.js';

const router = express.Router();

/**
 * @route GET /api/ai/trust/:roomId
 * @desc Get trust and risk profile for a room
 */
router.get('/:roomId', (req, res) => {
    const { roomId } = req.params;
    const profile = trustService.getTrustProfile(roomId);
    
    res.json(profile);
});

export default router;
