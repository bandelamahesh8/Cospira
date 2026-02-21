import { supabase } from '@/integrations/supabase/client';

export interface Quest {
    id: string; // player_quest id
    title: string;
    description: string;
    target_count: number;
    current_progress: number;
    reward_type: 'coins' | 'xp';
    reward_amount: number;
    is_completed: boolean;
    is_claimed: boolean;
}

export class QuestService {

    static async getDailyQuests(userId: string): Promise<Quest[]> {
        const today = new Date().toISOString().split('T')[0];

        // 1. Check existing
        const { data: existing, error } = await supabase
            .from('player_quests')
            .select(`
                *,
                definition:quest_definitions (
                    title, description, target_count, reward_type, reward_amount
                )
            `)
            .eq('user_id', userId)
            .eq('assigned_at', today);

        if (existing && existing.length > 0) {
            return existing.map((q: any) => ({
                id: q.id,
                title: q.definition.title,
                description: q.definition.description,
                target_count: q.definition.target_count,
                reward_type: q.definition.reward_type,
                reward_amount: q.definition.reward_amount,
                current_progress: q.current_progress,
                is_completed: q.is_completed,
                is_claimed: q.is_claimed
            }));
        }

        // 2. Assign New Quests (Mock Random Assignment)
        const { data: allDefs } = await supabase.from('quest_definitions').select('*').limit(3);
        if (!allDefs) return [];

        const newQuests = allDefs.map(def => ({
            user_id: userId,
            quest_id: def.id,
            assigned_at: today
        }));

        const { data: created, error: insertError } = await supabase
            .from('player_quests')
            .insert(newQuests)
            .select(`
                *,
                definition:quest_definitions (
                    title, description, target_count, reward_type, reward_amount
                )
            `);

        if (insertError) throw insertError;
        
        return (created || []).map((q: any) => ({
            id: q.id,
            title: q.definition.title,
            description: q.definition.description,
            target_count: q.definition.target_count,
            reward_type: q.definition.reward_type,
            reward_amount: q.definition.reward_amount,
            current_progress: q.current_progress,
            is_completed: q.is_completed,
            is_claimed: q.is_claimed
        }));
    }

    static async claimInfo(userId: string, quest: Quest) {
        if (quest.is_claimed || !quest.is_completed) return;

        // Grant Reward
        if (quest.reward_type === 'coins') {
             const { data: profile } = await supabase.from('player_profiles').select('coins').eq('id', userId).single();
             if (profile) {
                 await supabase.from('player_profiles').update({ coins: profile.coins + quest.reward_amount }).eq('id', userId);
             }
        }
        // Handle XP via SeasonService or Profile update if XP column exists (omitted for brevity, assume Coins)

        // Mark Claimed
        await supabase.from('player_quests').update({ is_claimed: true }).eq('id', quest.id);
    }
}
