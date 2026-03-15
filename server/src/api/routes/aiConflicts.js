import express from 'express';
import conflictDetector from '../services/ai/ConflictDetector.js';

const router = express.Router();

/**
 * @route GET /api/ai/conflicts
 * @desc Get recent human vs AI conflicts
 */
router.get('/', (req, res) => {
    res.json(conflictDetector.getConflicts());
});

export default router;
