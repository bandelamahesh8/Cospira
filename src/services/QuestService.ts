/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/integrations/supabase/client';

export interface Quest {
  id: string;
  title: string;
  description: string;
  target_count: number;
  reward_type: 'coins' | 'xp' | 'item';
  reward_amount: number;
  current_progress: number;
  is_completed: boolean;
  is_claimed: boolean;
}

export class QuestService {
  /**
   * Get player's current quests
   */
  static async getDailyQuests(userId: string): Promise<Quest[]> {
    // Fetch player quests
    const { data: existing, error: fetchError } = await supabase
       
      .from('player_quests' as any)
      .select(
        `
                *,
                definition:quest_definitions(*)
            `
      )
      .eq('user_id', userId);

    if (fetchError) {
      console.error('Error fetching quests:', fetchError);
      return [];
    }

    if (existing && (existing as unknown[]).length > 0) {
      return (existing as unknown[]).map((row) => {
         
        const q = row as any; // Nested properties from join need flexible access
        return {
          id: q.id,
          title: q.definition.title,
          description: q.definition.description,
          target_count: q.definition.target_count,
          reward_type: q.definition.reward_type,
          reward_amount: q.definition.reward_amount,
          current_progress: q.current_progress,
          is_completed: q.is_completed,
          is_claimed: q.is_claimed,
        };
      });
    }

    // If no quests assigned today, assign new ones
    const { data: allDefs } = await supabase
       
      .from('quest_definitions' as any)
      .select('*');
    if (!allDefs) return [];

    const todayDefs = (allDefs as unknown[]).slice(0, 3); // Simple logic: pick first 3
    const assignments = todayDefs.map((def) => ({
      user_id: userId,
      quest_id: (def as { id: string }).id,
      assigned_at: new Date().toISOString(),
    }));

    const { data: created, error: assignError } = await supabase
       
      .from('player_quests' as any)
      .insert(assignments).select(`
                *,
                definition:quest_definitions(*)
            `);

    if (assignError) {
      console.error('Error assigning quests:', assignError);
      return [];
    }

    return ((created as unknown[]) || []).map((row) => {
       
      const q = row as any;
      return {
        id: q.id,
        title: q.definition.title,
        description: q.definition.description,
        target_count: q.definition.target_count,
        reward_type: q.definition.reward_type,
        reward_amount: q.definition.reward_amount,
        current_progress: q.current_progress,
        is_completed: q.is_completed,
        is_claimed: q.is_claimed,
      };
    });
  }

  /**
   * Claim reward for a completed quest
   */
  static async claimQuestReward(
    userId: string,
    questId: string
  ): Promise<{ success: boolean; error: string | null }> {
    const { data: quest } = await supabase
       
      .from('player_quests' as any)
      .select('*, definition:quest_definitions(*)')
      .eq('id', questId)
      .single();

     
    if (!quest || !(quest as any).is_completed)
      return { success: false, error: 'Quest not completed' };
     
    if ((quest as any).is_claimed) return { success: false, error: 'Already claimed' };

    // Update claimed status
    const { error } = await supabase
       
      .from('player_quests' as any)
       
      .update({ is_claimed: true } as any)
      .eq('id', questId);
    if (error) return { success: false, error: error.message };

    // Award reward
     
    if ((quest as any).definition?.reward_type === 'coins') {
      const { data: profile } = await supabase
        .from('player_profiles')
        .select('coins')
        .eq('id', userId)
        .single();
      if (profile) {
         
        await supabase
          .from('player_profiles')
          .update({ coins: (profile as any).coins + (quest as any).definition.reward_amount })
          .eq('id', userId);
      }
    }

    return { success: true, error: null };
  }
}
