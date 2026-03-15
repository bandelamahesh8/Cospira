import express from 'express';
import ethicsService from '../services/ai/EthicsService.js';

const router = express.Router();

/**
 * @route GET /api/ai/ethics/pulse
 * @desc Get current ethical health pulse
 */
router.get('/pulse', (req, res) => {
    res.json(ethicsService.getHealth());
});

/**
 * @route GET /api/ai/ethics/audit
 * @desc Get ethical audit logs
 */
router.get('/audit', (req, res) => {
    res.json(ethicsService.getLogs());
});

export default router;
