import express from 'express';
import optimizationEngine from '../services/ai/OptimizationEngine.js';

const router = express.Router();

/**
 * @route GET /api/ai/optimize/status/:roomId
 * @desc Get optimization status and recommendations
 */
router.get('/status/:roomId', async (req, res) => {
    try {
        const { roomId } = req.params;
        const recommendations = await optimizationEngine.analyzeAndOptimize(roomId);
        res.json({
            settings: optimizationEngine.getSettings(),
            recommendations
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route POST /api/ai/optimize/apply/:roomId
 * @desc Manually apply a recommendation
 */
router.post('/apply/:roomId', async (req, res) => {
    try {
        const { roomId } = req.params;
        const { recommendation } = req.body;
        await optimizationEngine.applyOptimization(roomId, recommendation);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route POST /api/ai/optimize/settings
 * @desc Update auto-heal settings
 */
router.post('/settings', (req, res) => {
    optimizationEngine.updateSettings(req.body);
    res.json(optimizationEngine.getSettings());
});

export default router;
