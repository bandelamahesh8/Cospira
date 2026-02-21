import { supabase } from '@/integrations/supabase/client';
import { Tournament, TournamentMatch, TournamentParticipant } from '@/types/tournament';

export class TournamentService {
    
    // --- QUERY ---

    static async getTournaments(): Promise<Tournament[]> {
        const { data, error } = await supabase
            .from('tournaments')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        // We need player count. A separate query or join is needed.
        // For MVP, simplistic approach:
        const tournaments = data as any[];
        
        // Fetch counts
        for (const t of tournaments) {
            const { count } = await supabase
                .from('tournament_participants')
                .select('*', { count: 'exact', head: true })
                .eq('tournament_id', t.id);
            t.currentPlayers = count || 0;
        }

        return tournaments.map(t => ({
            id: t.id,
            name: t.name,
            gameType: t.game_type,
            status: t.status,
            startTime: t.start_time,
            maxPlayers: t.max_players,
            currentPlayers: t.currentPlayers,
            entryFee: t.entry_fee,
            prizePool: t.prize_pool,
            createdBy: t.created_by
        }));
    }

    // --- ACTIONS ---

    static async createTournament(name: string, gameType: string, maxPlayers: number): Promise<string | null> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data, error } = await supabase
            .from('tournaments')
            .insert({
                name,
                game_type: gameType,
                max_players: maxPlayers,
                created_by: user.id,
                status: 'registration'
            })
            .select()
            .single();
        
        if (error) {
            console.error('Create tournament error:', error);
            return null;
        }
        return data.id;
    }

    static async joinTournament(tournamentId: string): Promise<boolean> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        const { error } = await supabase
            .from('tournament_participants')
            .insert({
                tournament_id: tournamentId,
                player_id: user.id
            });
        
        return !error;
    }

    // --- BRACKET GENERATION (The Hard Part) ---

    static async startTournament(tournamentId: string) {
         // 1. Fetch Participants
         const { data: participants } = await supabase
            .from('tournament_participants')
            .select('player_id')
            .eq('tournament_id', tournamentId);
        
        if (!participants || participants.length < 2) return { error: 'Not enough players' };
        
        // Shuffle
        const players = participants.map(p => p.player_id).sort(() => Math.random() - 0.5);

        // 2. Generate Schema
        // Example: 8 Players -> 4 Matches (R1) -> 2 Matches (R2) -> 1 Match (R3)
        // We build from Finals backwards or Round 1 forwards? 
        // Building Round 1 forwards is easier for ID linking if we do it carefully, 
        // BUT we need NextMatchID. So Finals backwards gives us IDs to link to.
        
        const totalRounds = Math.ceil(Math.log2(players.length)); // e.g., 8 -> 3 rounds
        
        let nextRoundMatches: string[] = []; // IDs of matches in the "next" round

        // Iterate Rounds: Final (3) -> Semis (2) -> Quarters (1)
        for (let r = totalRounds; r >= 1; r--) {
            const matchesInRound = Math.pow(2, totalRounds - r); // R3=1, R2=2, R1=4
            const currentRoundMatchIds: string[] = [];

            for (let i = 0; i < matchesInRound; i++) {
                // Determine players if it's Round 1
                let p1 = null;
                let p2 = null;
                
                if (r === 1) {
                    // Seed players
                    p1 = players[i * 2] || null;
                    p2 = players[i * 2 + 1] || null;
                }

                // Determine next match ID (parent node)
                // Match i in this round feeds into Math.floor(i/2) in next round
                const nextMatchId = nextRoundMatches.length > 0 ? nextRoundMatches[Math.floor(i / 2)] : null;

                // Insert Match
                const { data: matchData, error } = await supabase
                    .from('tournament_matches')
                    .insert({
                        tournament_id: tournamentId,
                        round: r,
                        match_index: i,
                        player1_id: p1,
                        player2_id: p2,
                        next_match_id: nextMatchId,
                        status: 'scheduled'
                    })
                    .select()
                    .single();
                
                if (matchData) currentRoundMatchIds.push(matchData.id);
            }
            // Propagate IDs to the previous round (which is logically the 'next' round in loop terms, but we are looping backwards? Wait.)
            // The loop goes Final -> Quarter.
            // Final (R3) creates 1 match. ID goes to R2.
            // R2 creates 2 matches. They link to R3 match.
            // Correct.
            nextRoundMatches = currentRoundMatchIds;
        }

        // 3. Update Tournament Status
        await supabase
            .from('tournaments')
            .update({ status: 'active' })
            .eq('id', tournamentId);

        return { success: true };
    }

    static async getBracket(tournamentId: string): Promise<TournamentMatch[]> {
        const { data, error } = await supabase
            .from('tournament_matches')
            .select(`
                *,
                p1:player1_id(username, avatar_url),
                p2:player2_id(username, avatar_url)
            `)
            .eq('tournament_id', tournamentId)
            .order('round', { ascending: true })
            .order('match_index', { ascending: true });

        if (error) return [];

        return data.map((m: any) => ({
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
            player2: m.p2
        }));
    }
}
