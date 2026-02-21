import { supabase } from '@/integrations/supabase/client';

export interface MetaPlayer {
    id: string;
    username: string;
    avatar_url: string;
    chess_elo: number;
    total_wins: number;
    tournaments_won: number;
    oss: number;
    rank?: number;
}

export class MetaService {

    static async getTopPlayers(limit = 100) {
        const { data, error } = await supabase
            .from('oss_leaderboard')
            .select('*')
            .limit(limit);
            
        if (error) throw error;
        return data as MetaPlayer[];
    }

    static async getPlayerRank(userId: string) {
        // Retrieve single player's stats
        const { data, error } = await supabase
            .from('oss_leaderboard')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) return null;
        return data as MetaPlayer;
    }
}
