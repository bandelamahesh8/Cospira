import express from 'express';
import simulationEngine from '../services/ai/SimulationEngine.js';
import scenarioGenerator from '../services/ai/ScenarioGenerator.js';

const router = express.Router();

/**
 * @route GET /api/ai/simulation/templates
 * @desc Get available simulation templates
 */
router.get('/templates', (req, res) => {
    res.json(scenarioGenerator.getTemplates());
});

/**
 * @route POST /api/ai/simulation/run
 * @desc Run a simulation for a room
 */
router.post('/run/:roomId', async (req, res) => {
    try {
        const { roomId } = req.params;
        const { templateId } = req.body;
        
        const template = scenarioGenerator.getTemplateById(templateId);
        if (!template) {
            return res.status(404).json({ error: 'Scenario template not found' });
        }

        const results = await simulationEngine.runSimulation(roomId, template);
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route GET /api/ai/simulation/history/:roomId
 * @desc Get simulation history for a room
 */
router.get('/history/:roomId', (req, res) => {
    const { roomId } = req.params;
    res.json(simulationEngine.getAllForRoom(roomId));
});

export default router;
