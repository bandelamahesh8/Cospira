import { PlayerProfile } from './player';

export type TournamentStatus = 'registration' | 'active' | 'completed';

export interface Tournament {
    id: string;
    name: string;
    gameType: string;
    status: TournamentStatus;
    startTime: string; // ISO date
    maxPlayers: number;
    currentPlayers: number; // Derived count
    entryFee: number;
    prizePool: number;
    createdBy: string;
}

export interface TournamentParticipant {
    tournamentId: string;
    playerId: string;
    player?: PlayerProfile; // Joined data
    status: 'active' | 'eliminated' | 'winner';
}

export interface TournamentMatch {
    id: string;
    tournamentId: string;
    round: number;
    matchIndex: number;
    player1Id?: string;
    player2Id?: string;
    winnerId?: string;
    nextMatchId?: string;
    status: 'scheduled' | 'active' | 'completed';
    
    // UI Helpers
    player1?: PlayerProfile;
    player2?: PlayerProfile;
}
