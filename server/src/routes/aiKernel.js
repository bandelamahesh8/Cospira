import express from 'express';
import aiKernel from '../services/ai/AIKernel.js';

const router = express.Router();

/**
 * @route GET /api/ai/kernel/status
 * @desc Get comprehensive kernel and module status
 */
router.get('/status', (req, res) => {
    res.json(aiKernel.getStatus());
});

export default router;
