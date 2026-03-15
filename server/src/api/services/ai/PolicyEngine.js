import logger from '../../../shared/logger.js';

class PolicyEngine {
    constructor() {
        this.policies = new Map(); // orgId -> Array<{ id, name, constraint, value }>
        this.auditLogs = new Map(); // orgId -> Array<{ roomId, violation, timestamp }>
    }

    /**
     * Set a policy for an organization
     */
    setPolicy(orgId, policy) {
        const orgPolicies = this.policies.get(orgId) || [];
        const index = orgPolicies.findIndex(p => p.id === policy.id);
        
        if (index >= 0) {
            orgPolicies[index] = policy;
        } else {
            orgPolicies.push(policy);
        }

        this.policies.set(orgId, orgPolicies);
        logger.info(`[PolicyEngine] Policy updated for Org ${orgId}: ${policy.name}`);
    }

    /**
     * Audit a room against Org policies
     */
    async auditRoom(orgId, roomId, roomSettings) {
        const orgPolicies = this.policies.get(orgId) || [];
        const violations = [];

        for (const policy of orgPolicies) {
            // Example Policy: { id: 'min_transparency', constraint: 'GREATER_THAN', value: 70 }
            if (policy.id === 'min_transparency' && roomSettings.transparency < policy.value) {
                violations.push({
                    policyId: policy.id,
                    policyName: policy.name,
                    severity: 'HIGH',
                    message: `Room transparency (${roomSettings.transparency}) is below Org minimum (${policy.value}).`
                });
            }

            if (policy.id === 'max_risk' && roomSettings.riskScore > policy.value) {
                violations.push({
                    policyId: policy.id,
                    policyName: policy.name,
                    severity: 'CRITICAL',
                    message: `Room risk score (${roomSettings.riskScore}) exceeds Org ceiling (${policy.value}).`
                });
            }
        }

        if (violations.length > 0) {
            const logs = this.auditLogs.get(orgId) || [];
            logs.push({ roomId, violations, timestamp: new Date().toISOString() });
            this.auditLogs.set(orgId, logs);
        }

        return violations;
    }

    getPolicies(orgId) {
        return this.policies.get(orgId) || [];
    }

    getAuditLogs(orgId) {
        return this.auditLogs.get(orgId) || [];
    }
}

export default new PolicyEngine();
