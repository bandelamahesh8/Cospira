import { supabase } from '@/integrations/supabase/client';
import { GameType } from '@/types/player';

export interface EloHistoryPoint {
    date: string;
    elo: number;
    gameType: string;
}

export interface MatchReplayData {
    id: string;
    gameType: GameType;
    players: { id: string; username: string; avatarUrl?: string }[];
    winnerId?: string;
    moves: any[];
    initialState: any;
    finalState: any;
    date: string;
}

export class AnalyticsService {
    
    // Get ELO History for a specific game type
    static async getEloHistory(playerId: string, gameType: GameType): Promise<EloHistoryPoint[]> {
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data, error } = await (supabase as any)
                .from('elo_history')
                .select('created_at, new_elo')
                .eq('player_id', playerId)
                .eq('game_type', gameType)
                .order('created_at', { ascending: true });

            if (error) {
                // If table doesn't exist (404) or other error, return empty
                // console.warn('ELO history fetch error:', error);
                return [];
            }
            if (!data) return [];

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return data.map((d: any) => ({
                date: d.created_at,
                elo: d.new_elo,
                gameType
            }));
        } catch {
            return [];
        }
    }

    // Get Recent Matches for Replay List
    static async getRecentMatches(playerId: string): Promise<Partial<MatchReplayData>[]> {
        // This is tricky because match_history stores players as JSONB array usually
        // We need to filter where the JSON contains the player ID.
        // Supabase/Postgrest syntax: players @> '[{"id": "PLAYER_ID"}]'
        
        try {
            // Manually stringify the filter value to ensure it doesn't get encoded as [object Object]
            const filterValue = JSON.stringify([{ id: playerId }]);
            
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data, error } = await (supabase as any)
                .from('match_history')
                .select('*')
                .contains('players', filterValue) 
                .order('created_at', { ascending: false })
                .limit(10);
    
            if (error || !data) return [];
    
            return data.map((m: any) => ({
                id: m.id,
                gameType: m.game_type,
                players: m.players,
                winnerId: m.winner_id,
                date: m.created_at
            }));
        } catch {
            return [];
        }
    }

    // Get Full Replay Data
    static async getReplay(matchId: string): Promise<MatchReplayData | null> {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any)
            .from('match_history')
            .select('*')
            .eq('id', matchId)
            .single();

        if (error || !data) return null;

        return {
            id: data.id,
            gameType: data.game_type,
            players: data.players,
            winnerId: data.winner_id,
            moves: data.move_history || [], // Ensure we use snake_case map if DB is snake_case
            initialState: data.initial_state,
            finalState: data.final_state,
            date: data.created_at
        };
    }

    // Log ELO Change (Client-side usage for MVP)
    static async logEloChange(playerId: string, gameType: string, oldElo: number, newElo: number, matchId?: string) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from('elo_history').insert({
            player_id: playerId,
            game_type: gameType,
            old_elo: oldElo,
            new_elo: newElo,
            match_id: matchId,
            reason: 'match'
        });
    }
}
