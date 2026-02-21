import { supabase } from '@/integrations/supabase/client';
import { SimulationEngine } from './SimulationEngine';
import { PolicyEngine } from './PolicyEngine';

export class EvolutionEngine {

    /**
     * Phase 35: Evolution Engine (Genetic AI)
     * Takes the best performing policies and mutates them to find finding optimizations.
     */
    static async runEvolutionCycle() {
        console.log("🧬 [EVOLUTION] Starting Genetic Algorithm...");
        
        // 1. SELECT: Get top 3 policies by weight/confidence
        const { data: parents } = await supabase.from('brain_policies')
            .select('*')
            .eq('is_active', true)
            .order('weight', { ascending: false })
            .limit(3);
            
        if (!parents || parents.length === 0) return;

        for (const parent of parents as any[]) {
            // 2. MUTATE: Create a variant
            const mutant = this.mutatePolicy(parent);
            
            // 3. TEST: Run Simulation
            const result = await SimulationEngine.simulatePolicy(mutant);
            
            // 4. SELECT: If better, save it
            if (result.approved) {
                console.log(`🧬 [EVOLUTION] Mutation Successful! ${parent.title} -> ${mutant.title}`);
                await supabase.from('brain_policies').insert({
                    ...mutant,
                    title: mutant.title + " (Gen 2)",
                    is_generated: true,
                    is_active: false // Require manual approval or fully auto? Let's say pending.
                });
            } else {
                console.log(`🧬 [EVOLUTION] Mutation Failed. Discarding.`);
            }
        }
    }

    private static mutatePolicy(parent: any) {
        const mutant = JSON.parse(JSON.stringify(parent)); // Deep clone
        delete mutant.id;
        delete mutant.created_at; 
        
        // Mutate Condition Value (e.g. 0.7 -> 0.75)
        if (mutant.condition && typeof mutant.condition.value === 'number') {
            const mutationFactor = 1 + (Math.random() * 0.2 - 0.1); // +/- 10%
            mutant.condition.value *= mutationFactor;
        }

        // Mutate Action Param (e.g. reward 50 -> 55)
        // Implementation depends on action structure
        
        return mutant;
    }
}
