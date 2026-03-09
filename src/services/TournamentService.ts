import { supabase } from '@/integrations/supabase/client';
import { Tournament, TournamentMatch } from '@/types/tournament';

export class TournamentService {
  // --- QUERY ---

  static async getTournaments(): Promise<Tournament[]> {
    const { data, error } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('tournaments' as any)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const tournaments = (data || []) as unknown[];

    // Fetch counts
    for (const t of tournaments) {
      const { count } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from('tournament_participants' as any)
        .select('*', { count: 'exact', head: true })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .eq('tournament_id', (t as any).id);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (t as any).currentPlayers = count || 0;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return tournaments.map((t: any) => ({
      id: t.id,
      name: t.name,
      gameType: t.game_type,
      status: t.status,
      startTime: t.start_time,
      maxPlayers: t.max_players,
      currentPlayers: t.currentPlayers,
      entryFee: t.entry_fee,
      prizePool: t.prize_pool,
      createdBy: t.created_by,
    }));
  }

  // --- ACTIONS ---

  static async createTournament(
    name: string,
    gameType: string,
    maxPlayers: number
  ): Promise<string | null> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('tournaments' as any)
      .insert({
        name,
        game_type: gameType,
        max_players: maxPlayers,
        created_by: user.id,
        status: 'registration',
      })
      .select()
      .single();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (error || !data || (data as any).error) {
      console.error('Create tournament error:', error);
      return null;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data as any).id;
  }

  static async joinTournament(tournamentId: string): Promise<boolean> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('tournament_participants' as any)
      .insert({
        tournament_id: tournamentId,
        player_id: user.id,
      });

    return !error;
  }

  // --- BRACKET GENERATION ---

  static async startTournament(tournamentId: string) {
    const { data: participants } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('tournament_participants' as any)
      .select('player_id')
      .eq('tournament_id', tournamentId);

    if (!participants || (participants as unknown[]).length < 2)
      return { error: 'Not enough players' };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const players = (participants as any[])
      .map((p: any) => p.player_id)
      .sort(() => Math.random() - 0.5);
    const totalRounds = Math.ceil(Math.log2(players.length));

    let nextRoundMatches: string[] = [];

    for (let r = totalRounds; r >= 1; r--) {
      const matchesInRound = Math.pow(2, totalRounds - r);
      const currentRoundMatchIds: string[] = [];

      for (let i = 0; i < matchesInRound; i++) {
        let p1 = null;
        let p2 = null;

        if (r === 1) {
          p1 = players[i * 2] || null;
          p2 = players[i * 2 + 1] || null;
        }

        const nextMatchId =
          nextRoundMatches.length > 0 ? nextRoundMatches[Math.floor(i / 2)] : null;

        const { data: matchData } = await supabase
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .from('tournament_matches' as any)
          .insert({
            tournament_id: tournamentId,
            round: r,
            match_index: i,
            player1_id: p1,
            player2_id: p2,
            next_match_id: nextMatchId,
            status: 'scheduled',
          })
          .select()
          .single();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (matchData && !(matchData as any).error) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          currentRoundMatchIds.push((matchData as any).id);
        }
      }
      nextRoundMatches = currentRoundMatchIds;
    }

    await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('tournaments' as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ status: 'active' } as any)
      .eq('id', tournamentId);

    return { success: true };
  }

  static async getBracket(tournamentId: string): Promise<TournamentMatch[]> {
    const { data, error } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('tournament_matches' as any)
      .select(
        `
                *,
                p1:player1_id(username, avatar_url),
                p2:player2_id(username, avatar_url)
            `
      )
      .eq('tournament_id', tournamentId)
      .order('round', { ascending: true })
      .order('match_index', { ascending: true });

    if (error) return [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data as any[]).map((m: any) => ({
      id: m.id,
      tournamentId: m.tournament_id,
      round: m.round,
      matchIndex: m.match_index,
      player1Id: m.player1_id,
      player2Id: m.player2_id,
      winnerId: m.winner_id,
      nextMatchId: m.next_match_id,
      status: m.status,
      player1: m.p1,
      player2: m.p2,
    }));
  }
}
