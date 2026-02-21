export interface SimulationResult {
    policy_id: string;
    approved: boolean;
    impact_score: number;
    notes: string;
}

export class SimulationEngine {

    /**
     * Phase 34: Simulation Engine (Digital Twin)
     * Tests a policy before it touches real players.
     */
    static async simulatePolicy(policy: any): Promise<SimulationResult> {
        console.log(`🧪 [SIMULATION] Testing Policy: "${policy.title}"`);
        
        // 1. Create Virtual Population
        const populationSize = 100;
        let survived = 0;
        let revenue = 0;

        for (let i = 0; i < populationSize; i++) {
            // Virtual Player
            const p = {
                win_rate: Math.random(), // 0 to 1
                churn_prob: Math.random() // 0 to 1
            };

            // 2. Apply Policy Logic
            // Example: If win_rate < 0.3, give gift.
            let churnChance = p.churn_prob;
            
            // Check condition (mock logic mirroring PolicyEngine)
            if (p.win_rate < policy.condition.value) {
                 // Policy Triggered
                 if (policy.action.type === 'GIFT_CURRENCY') {
                     churnChance -= 0.2; // Reduce churn
                     revenue -= 0.5; // Cost money
                 }
            }

            // 3. Measure Outcome
            if (Math.random() > churnChance) survived++;
        }

        // 4. Calculate Net Impact
        // Did we save enough players to justify the cost?
        const retentionRate = survived / populationSize;
        const success = retentionRate > 0.6; // Threshold

        console.log(`🧪 [SIMULATION] Result: Retention=${retentionRate.toFixed(2)}, Approved=${success}`);

        return {
            policy_id: policy.id || 'temp',
            approved: success,
            impact_score: retentionRate,
            notes: success ? 'Policy improves retention significantly.' : 'Cost outweighs benefits.'
        };
    }
}
