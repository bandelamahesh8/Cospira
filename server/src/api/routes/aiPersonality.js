import express from 'express';
import personalityService from '../services/ai/PersonalityService.js';
import logger from '../../shared/logger.js';

const router = express.Router();

/**
 * @route GET /api/ai/personality
 * @desc Get all available personalities and current one
 */
router.get('/', (req, res) => {
    res.json({
        current: personalityService.getPersonality(),
        all: personalityService.getAllPersonalities()
    });
});

/**
 * @route POST /api/ai/personality/set
 * @desc Switch AI personality
 */
router.post('/set', (req, res) => {
    const { id } = req.body;
    if (personalityService.setPersonality(id)) {
        res.json({ success: true, personality: personalityService.getPersonality() });
    } else {
        res.status(400).json({ error: 'Invalid personality ID' });
    }
});

export default router;
