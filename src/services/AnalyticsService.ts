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
  moves: unknown[];
  initialState: unknown;
  finalState: unknown;
  date: string;
}

export class AnalyticsService {
  // Get ELO History for a specific game type
  static async getEloHistory(playerId: string, gameType: GameType): Promise<EloHistoryPoint[]> {
    try {
      const { data, error } = await supabase
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

      return data.map((d) => ({
        date: d.created_at,
        elo: d.new_elo,
        gameType,
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

      const { data, error } = await supabase
        .from('match_history')
        .select('*')
        .contains('players', filterValue)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error || !data) return [];

      return data.map((m) => ({
        id: m.id,
        gameType: m.game_type as GameType,
        players: m.players as unknown as MatchReplayData['players'],
        winnerId: m.winner_id || undefined,
        date: m.created_at,
      }));
    } catch {
      return [];
    }
  }

  // Get Full Replay Data
  static async getReplay(matchId: string): Promise<MatchReplayData | null> {
    const { data, error } = await supabase
      .from('match_history')
      .select('*')
      .eq('id', matchId)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      gameType: data.game_type as GameType,
      players: data.players as unknown as MatchReplayData['players'],
      winnerId: data.winner_id || undefined,
      moves: (data.move_history as unknown as unknown[]) || [], // Ensure we use snake_case map if DB is snake_case
      initialState: data.initial_state,
      finalState: data.final_state,
      date: data.created_at,
    };
  }

  // Log ELO Change (Client-side usage for MVP)
  static async logEloChange(
    playerId: string,
    gameType: string,
    oldElo: number,
    newElo: number,
    matchId?: string
  ) {
    await supabase.from('elo_history').insert({
      player_id: playerId,
      game_type: gameType,
      old_elo: oldElo,
      new_elo: newElo,
      match_id: matchId,
      reason: 'match',
    });
  }
}
