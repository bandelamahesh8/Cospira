import { BrainService } from './BrainService';
import { supabase } from '@/integrations/supabase/client';

export type ActionType = 'RETENTION_REWARD' | 'TILT_PROTECTION' | 'PROMOTE_TO_LEAGUE' | 'NONE';

export interface BrainDecision {
    action: ActionType;
    reason: string;
    confidence: number;
    timestamp: string;
}

export class DecisionEngine {
    
    static async decide(userId: string): Promise<BrainDecision> {
        // 1. Get Precognition Data
        const prediction = await BrainService.getPredictions(userId);
        
        if (!prediction) {
            return {
                action: 'NONE',
                reason: 'Insufficient Data',
                confidence: 0,
                timestamp: new Date().toISOString()
            };
        }

        // 2. Evaluate Rules (The "Cortex")
        
        // RULE 1: Churn Prevention
        if (prediction.churn_probability > 0.7) {
            return {
                action: 'RETENTION_REWARD',
                reason: 'High Churn Risk Detected (>70%)',
                confidence: 0.9,
                timestamp: new Date().toISOString()
            };
        }

        // RULE 2: Anti-Tilt Protocol
        if (prediction.tilt_probability > 0.6) {
            return {
                action: 'TILT_PROTECTION',
                reason: 'Tilt Probability Threshold Exceeded',
                confidence: 0.85,
                timestamp: new Date().toISOString()
            };
        }

        // RULE 3: Skill Promotion (Hot Streak)
        if (prediction.win_probability > 0.7 && prediction.improvement_rate > 5) {
            return {
                action: 'PROMOTE_TO_LEAGUE',
                reason: 'Player Overperforming Current Elo',
                confidence: 0.75,
                timestamp: new Date().toISOString()
            };
        }

        return {
            action: 'NONE',
            reason: 'Behavior Nominal',
            confidence: 1.0,
            timestamp: new Date().toISOString()
        };
    }

    // In a real system, this would execute the action (give coins, change queue, etc.)
    static async execute(userId: string, decision: BrainDecision) {
        if (decision.action === 'NONE') return;

        console.log(`[BRAIN] Executing ${decision.action} for ${userId}: ${decision.reason}`);
        
        // Mock Execution Log in DB (if table existed) or just Service logic
        // if (decision.action === 'RETENTION_REWARD') await StoreService.giveFreeGift(...);
    }
}
