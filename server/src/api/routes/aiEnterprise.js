import express from 'express';
import enterpriseService from '../services/ai/EnterpriseService.js';
import policyEngine from '../services/ai/PolicyEngine.js';

const router = express.Router();

/**
 * @route GET /api/ai/enterprise/stats/:orgId
 * @desc Get aggregated metrics for an organization
 */
router.get('/stats/:orgId', async (req, res) => {
    try {
        const { orgId } = req.params;
        const { roomIds } = req.query; // Expecting comma-separated list
        
        const rooms = roomIds ? roomIds.split(',') : [];
        const stats = await enterpriseService.getOrgHealth(orgId, rooms);
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route GET /api/ai/enterprise/audit/:orgId
 * @desc Get policy audit logs for an organization
 */
router.get('/audit/:orgId', (req, res) => {
    const { orgId } = req.params;
    res.json({
        policies: policyEngine.getPolicies(orgId),
        logs: policyEngine.getAuditLogs(orgId)
    });
});

/**
 * @route POST /api/ai/enterprise/policy/:orgId
 * @desc Create or update an Org-wide AI policy
 */
router.post('/policy/:orgId', (req, res) => {
    const { orgId } = req.params;
    const policy = req.body;
    policyEngine.setPolicy(orgId, policy);
    res.json({ success: true, policies: policyEngine.getPolicies(orgId) });
});

export default router;
