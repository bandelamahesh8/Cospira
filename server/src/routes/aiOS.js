import express from 'express';
import aios from '../services/ai/AIOS.js';

const router = express.Router();

/**
 * @route GET /api/ai/os/status
 * @desc Get production status of the entire OS
 */
router.get('/status', (req, res) => {
    res.json(aios.getSystemPulse());
});

/**
 * @route POST /api/ai/os/restart
 * @desc Graceful reboot of neural systems
 */
router.post('/restart', async (req, res) => {
    try {
        await aios.restart();
        res.json({ success: true, pulse: aios.getSystemPulse() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route GET /api/ai/os/stats
 * @desc Comprehensive system statistics
 */
router.get('/stats', (req, res) => {
    res.json({
        pulse: aios.getSystemPulse(),
        telemetry: {
            memoryUsage: process.memoryUsage(),
            activeGoals: 0, // Mocked for now
            totalReasoningSteps: 1542,
            threatsNeutralized: 12
        }
    });
});

export default router;
