import { supabase } from '@/integrations/supabase/client';
import { GameReplay } from '@/types/player';

export class ReplayService {
  static async saveReplay(data: Omit<GameReplay, 'id' | 'created_at'>) {
    const { data: replay, error } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('game_replays' as any)
      .insert(data)
      .select()
      .single();

    if (error) {
      console.error('Error saving replay:', error);
      return null;
    }

    return replay as unknown as GameReplay;
  }

  static async getReplay(id: string) {
    const { data, error } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('game_replays' as any)
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return data as unknown as GameReplay;
  }

  static async getReplayByMatchId(matchId: string) {
    const { data, error } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('game_replays' as any)
      .select('*')
      .eq('match_id', matchId)
      .single(); // Assuming 1 replay per match

    if (error) return null;
    return data as unknown as GameReplay;
  }
}
