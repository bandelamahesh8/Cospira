import { supabase } from '@/integrations/supabase/client';

export interface GameReplay {
    id: string;
    match_id?: string;
    game_type: string;
    moves: any[];
    snapshot?: any;
    players: {
        white?: { name: string; id: string };
        black?: { name: string; id: string };
        [key: string]: any;
    }; 
    created_at: string;
}

export class ReplayService {

    static async saveReplay(data: Omit<GameReplay, 'id' | 'created_at'>) {
        const { data: replay, error } = await supabase
            .from('game_replays')
            .insert(data)
            .select()
            .single();

        if (error) {
            console.error('[ReplayService] Failed to save replay:', error);
            return null;
        }
        return replay;
    }

    static async getReplay(id: string) {
        const { data, error } = await supabase
            .from('game_replays')
            .select('*')
            .eq('id', id)
            .single();

        if (error) return null;
        return data as GameReplay;
    }

    static async getReplayByMatchId(matchId: string) {
        const { data, error } = await supabase
            .from('game_replays')
            .select('*')
            .eq('match_id', matchId)
            .single(); // Assuming 1 replay per match

        if (error) return null;
        return data as GameReplay;
    }
}
