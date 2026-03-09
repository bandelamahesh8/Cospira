import { supabase } from '@/integrations/supabase/client';

export interface ClanWar {
  id: string;
  challenger_clan_id: string;
  defender_clan_id: string;
  status: 'pending' | 'active' | 'completed' | 'declined';
  challenger_score: number;
  defender_score: number;
  game_type: string;
  challenger?: { name: string; tag: string };
  defender?: { name: string; tag: string };
}

export class ClanWarService {
  static async challengeClan(challengerId: string, defenderId: string, gameType: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('clan_wars')
      .insert({
        challenger_clan_id: challengerId,
        defender_clan_id: defenderId,
        game_type: gameType,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async respondToChallenge(warId: string, accept: boolean) {
    const status = accept ? 'active' : 'declined';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('clan_wars')
      .update({ status, start_time: accept ? new Date().toISOString() : null })
      .eq('id', warId);

    if (error) throw error;
  }

  static async getClanWars(clanId: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('clan_wars')
      .select(
        `
                *,
                challenger:clans!challenger_clan_id(name, tag),
                defender:clans!defender_clan_id(name, tag)
            `
      )
      .or(`challenger_clan_id.eq.${clanId},defender_clan_id.eq.${clanId}`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  // Call this when a game ends
  static async resolveBattle(warId: string, _winnerId: string, isChallenger: boolean) {
    // Increment score
    // We need to know which score to increment.
    // Ideally we check if winner belongs to challenger or defender clan.
    // Simplified: Pass isChallenger flag.

    const column = isChallenger ? 'challenger_score' : 'defender_score';

    // RPC call would be atomic, but read-update-write is ok for MVP low volume
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: war } = await (supabase as any)
      .from('clan_wars')
      .select(column)
      .eq('id', warId)
      .single();
    if (war) {
      const currentScore = (war as unknown as Record<string, number>)[column] || 0;
      const newScore = currentScore + 1;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('clan_wars')
        .update({ [column]: newScore })
        .eq('id', warId);
    }
  }
}
