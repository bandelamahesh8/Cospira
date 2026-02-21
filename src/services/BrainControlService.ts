import { supabase } from '@/integrations/supabase/client';
import { MutationSuggestion } from './MetaEvolutionService';
import { BrainDecision } from './DecisionEngine';

export type ControlActionType = 'APPLY_MUTATION' | 'INTERVENE_PLAYER' | 'SYSTEM_OVERRIDE';

export interface BrainActionLog {
    id: string;
    action_type: ControlActionType;
    target_id: string;
    payload: any;
    status: string;
    created_at: string;
}

export class BrainControlService {

    /**
     * The Brain's Actuator. Requires Root System Privileges (Mocked).
     */
    static async executeAction(type: ControlActionType, targetId: string, payload: any) {
        console.log(`[BRAIN CONTROL] Executing ${type} on ${targetId}`, payload);

        // 1. Audit Log
        await supabase.from('brain_actions').insert({
            action_type: type,
            target_id: targetId,
            payload: payload,
            status: 'EXECUTED'
        });

        // 2. Execution Logic
        if (type === 'APPLY_MUTATION') {
            await this.applyMutation(targetId, payload as MutationSuggestion);
        }
        else if (type === 'INTERVENE_PLAYER') {
            await this.intervenePlayer(targetId, payload as BrainDecision);
        }
    }

    private static async applyMutation(strategyKey: string, mutation: MutationSuggestion) {
        // In a real game, this would update a configuration table or JSON file.
        // For Cospira Demo, we mark the mutation as APPLIED in the evolution table.
        // Update functionality mocked here.
        console.log(`[SYSTEM] Applied Balance Patch: ${mutation.action} ${strategyKey} (${mutation.change})`);
        
        // We could update the meta_evolution table entry to APPLIED if we had the ID, 
        // but here we just log the system event.
    }

    private static async intervenePlayer(userId: string, decision: BrainDecision) {
        // Execute the intervention
        // e.g. Add coins, change matchmaking bucket
        if (decision.action === 'RETENTION_REWARD') {
             console.log(`[SYSTEM] Sent Gift to ${userId}`);
             // StoreService.giveGift(userId, 'retention_box');
        } else if (decision.action === 'TILT_PROTECTION') {
             console.log(`[SYSTEM] Initialized Soft Queue for ${userId}`);
        }
    }

    static async getActionLog() {
        const { data } = await supabase.from('brain_actions')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);
        return data as BrainActionLog[];
    }
}
