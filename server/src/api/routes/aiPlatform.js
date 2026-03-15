import express from 'express';
import platformManager from '../services/ai/PlatformManager.js';
import aiSyncEngine from '../services/ai/AISyncEngine.js';

const router = express.Router();

/**
 * @route GET /api/ai/platform/status/:userId
 * @desc Get cross-platform status for a user
 */
router.get('/status/:userId', (req, res) => {
    const { userId } = req.params;
    res.json({
        sessions: platformManager.getSessions(userId),
        lastSync: aiSyncEngine.getSyncStatus(userId)
    });
});

/**
 * @route POST /api/ai/platform/sync/:userId
 * @desc Manually trigger a cross-platform sync
 */
router.post('/sync/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const state = req.body;
        const result = await aiSyncEngine.syncState(userId, state);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route POST /api/ai/platform/register/:userId
 * @desc Register current device platform
 */
router.post('/register/:userId', (req, res) => {
    const { userId } = req.params;
    const { platform, capabilities } = req.body;
    platformManager.registerSession(userId, platform, capabilities);
    res.json({ success: true });
});

export default router;
