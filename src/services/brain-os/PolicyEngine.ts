import { supabase } from '@/integrations/supabase/client';
import { BrainService } from '../BrainService';

export interface BrainPolicy {
    id: string;
    domain: string;
    title: string;
    condition: any;
    action: any;
    weight: number;
}

export class PolicyEngine {
    private static cache: BrainPolicy[] = [];

    /**
     * Loads policies into memory.
     */
    static async loadPolicies() {
        const { data } = await supabase.from('brain_policies')
            .select('*')
            .eq('is_active', true)
            .order('weight', { ascending: false });
            
        if (data) {
            this.cache = data as BrainPolicy[];
            console.log(`[POLICY_ENGINE] Loaded ${this.cache.length} policies.`);
        }
    }

    /**
     * Evaluates all policies against a player's current state.
     */
    static async evaluatePoliciesForPlayer(userId: string, context: string, payload: any) {
        // 1. Get Player Context (DNA + Predictions)
        const predictions = await BrainService.getPredictions(userId);
        if (!predictions) return [];

        const matchingDecisions: any[] = [];

        // 2. Iterate Policies
        for (const policy of this.cache) {
            if (policy.domain !== 'ALL' && policy.domain !== context) continue;

            const isMatch = this.checkCondition(policy.condition, predictions, payload);
            
            if (isMatch) {
                console.log(`[POLICY_MATCH] Policy "${policy.title}" matched for user ${userId}`);
                matchingDecisions.push({
                    policy_id: policy.id,
                    action: policy.action,
                    weight: policy.weight
                });
            }
        }

        return matchingDecisions;
    }

    /**
     * Simple Condition Evaluator
     * condition: { metric: 'churn_probability', operator: '>', value: 0.5 }
     */
    private static checkCondition(condition: any, playerState: any, eventPayload: any): boolean {
        // Resolve metric from player state (e.g. predictions.churn_probability)
        let actualValue = playerState[condition.metric];
        
        // Or from event payload
        if (actualValue === undefined && eventPayload) {
            actualValue = eventPayload[condition.metric];
        }

        if (actualValue === undefined) return false;

        switch (condition.operator) {
            case '>': return actualValue > condition.value;
            case '<': return actualValue < condition.value;
            case '>=': return actualValue >= condition.value;
            case '<=': return actualValue <= condition.value;
            case '==': return actualValue == condition.value;
            default: return false;
        }
    }
}
