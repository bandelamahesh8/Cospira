import express from 'express';
import aiModuleSystem from '../services/ai/AIModuleSystem.js';

const router = express.Router();

/**
 * @route GET /api/ai/plugins/list
 * @desc Get list of active and available plugins
 */
router.get('/list', (req, res) => {
    res.json({
        active: aiModuleSystem.getPlugins(),
        marketplace: aiModuleSystem.getMarketplace()
    });
});

/**
 * @route POST /api/ai/plugins/toggle
 * @desc Install/Uninstall a plugin
 */
router.post('/toggle', async (req, res) => {
    try {
        const { pluginId, action } = req.body;
        
        if (action === 'INSTALL') {
            await aiModuleSystem.loadPlugin(pluginId);
        } else {
            await aiModuleSystem.unloadPlugin(pluginId);
        }
        
        res.json({ success: true, active: aiModuleSystem.getPlugins() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
