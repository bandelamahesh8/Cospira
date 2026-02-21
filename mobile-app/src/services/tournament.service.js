import AsyncStorage from '@react-native-async-storage/async-storage';
import { socketService } from './socket.service';
import { api } from './api';

class TournamentService {
  constructor() {
    this.tournaments = [];
    this.currentTournament = null;
    this.participatingTournaments = [];
    this.listeners = [];
  }

  // Initialize tournament service
  async initialize() {
    try {
      const storedTournaments = await AsyncStorage.getItem('tournaments');
      const storedParticipating = await AsyncStorage.getItem('participatingTournaments');
      
      if (storedTournaments) {
        this.tournaments = JSON.parse(storedTournaments);
      }
      if (storedParticipating) {
        this.participatingTournaments = JSON.parse(storedParticipating);
      }

      this.setupSocketListeners();
      
      // Load tournaments if authenticated
      if (api.getToken()) {
        await this.loadTournaments();
      }
    } catch (error) {
      console.error('[TournamentService] Initialization error:', error);
    }
  }

  setupSocketListeners() {
    // Tournament updates
    socketService.on('tournament_created', (tournament) => {
      this.tournaments.unshift(tournament);
      this.saveTournaments();
      this.notifyListeners('tournament_created', tournament);
    });

    socketService.on('tournament_updated', (tournament) => {
      const index = this.tournaments.findIndex(t => t.id === tournament.id);
      if (index !== -1) {
        this.tournaments[index] = tournament;
        this.saveTournaments();
        this.notifyListeners('tournament_updated', tournament);
      }
    });

    socketService.on('tournament_started', (tournament) => {
      const index = this.tournaments.findIndex(t => t.id === tournament.id);
      if (index !== -1) {
        this.tournaments[index] = { ...this.tournaments[index], ...tournament };
        this.saveTournaments();
        this.notifyListeners('tournament_started', tournament);
      }
    });

    socketService.on('tournament_ended', (tournament) => {
      const index = this.tournaments.findIndex(t => t.id === tournament.id);
      if (index !== -1) {
        this.tournaments[index] = { ...this.tournaments[index], ...tournament };
        this.saveTournaments();
        this.notifyListeners('tournament_ended', tournament);
      }
    });

    // Match updates
    socketService.on('match_created', (data) => {
      this.notifyListeners('match_created', data);
    });

    socketService.on('match_updated', (data) => {
      this.notifyListeners('match_updated', data);
    });

    socketService.on('match_completed', (data) => {
      this.notifyListeners('match_completed', data);
    });

    // Participation updates
    socketService.on('tournament_joined', (data) => {
      this.participatingTournaments.push(data.tournamentId);
      this.saveParticipatingTournaments();
      this.notifyListeners('tournament_joined', data);
    });

    socketService.on('tournament_left', (data) => {
      this.participatingTournaments = this.participatingTournaments.filter(
        id => id !== data.tournamentId
      );
      this.saveParticipatingTournaments();
      this.notifyListeners('tournament_left', data);
    });
  }

  // Create tournament
  async createTournament(tournamentData) {
    try {
      return await api.post('/tournaments', tournamentData);
    } catch (error) {
      console.error('[TournamentService] Create tournament error:', error);
      throw error;
    }
  }

  // Join tournament
  async joinTournament(tournamentId) {
    try {
      return await api.post(`/tournaments/${tournamentId}/join`);
    } catch (error) {
      console.error('[TournamentService] Join tournament error:', error);
      throw error;
    }
  }

  // Leave tournament
  async leaveTournament(tournamentId) {
    try {
      return await api.post(`/tournaments/${tournamentId}/leave`);
    } catch (error) {
      console.error('[TournamentService] Leave tournament error:', error);
      throw error;
    }
  }

  // Get tournaments
  async getTournaments(filters = {}) {
    try {
      const tournaments = await api.get('/tournaments', filters);
      this.tournaments = tournaments;
      await this.saveTournaments();
      return tournaments;
    } catch (error) {
      console.error('[TournamentService] Get tournaments error:', error);
      throw error;
    }
  }

  // Get tournament by ID
  async getTournament(tournamentId) {
    try {
      return await api.get(`/tournaments/${tournamentId}`);
    } catch (error) {
      console.error('[TournamentService] Get tournament error:', error);
      throw error;
    }
  }

  // Get tournament matches
  async getTournamentMatches(tournamentId) {
    try {
      return await api.get(`/tournaments/${tournamentId}/matches`);
    } catch (error) {
      console.error('[TournamentService] Get tournament matches error:', error);
      throw error;
    }
  }

  // Get tournament leaderboard
  async getTournamentLeaderboard(tournamentId) {
    try {
      return await api.get(`/tournaments/${tournamentId}/leaderboard`);
    } catch (error) {
      console.error('[TournamentService] Get tournament leaderboard error:', error);
      throw error;
    }
  }

  // Submit match result
  async submitMatchResult(matchId, result) {
    try {
      return await api.post(`/tournaments/matches/${matchId}/result`, result);
    } catch (error) {
      console.error('[TournamentService] Submit match result error:', error);
      throw error;
    }
  }

  // Generate bracket
  generateBracket(participants, tournamentType = 'single_elimination') {
    const bracket = [];
    
    if (tournamentType === 'single_elimination') {
      // Single elimination bracket
      const rounds = Math.ceil(Math.log2(participants.length));
      let currentRound = participants.map((p, i) => ({
        id: `match-${i}`,
        round: 1,
        player1: p,
        player2: participants[i + 1] || null,
        winner: null,
        nextMatch: null
      }));

      // Filter out matches with only one player (byes)
      currentRound = currentRound.filter(m => m.player1 && m.player2);

      bracket.push(...currentRound);

      // Generate subsequent rounds
      for (let round = 2; round <= rounds; round++) {
        const matchesInRound = Math.ceil(currentRound.length / 2);
        const nextRound = [];
        
        for (let i = 0; i < matchesInRound; i++) {
          nextRound.push({
            id: `match-round${round}-${i}`,
            round: round,
            player1: null, // Will be determined by previous round winners
            player2: null,
            winner: null,
            nextMatch: round < rounds ? `match-round${round + 1}-${Math.floor(i / 2)}` : null
          });
        }
        
        bracket.push(...nextRound);
        currentRound = nextRound;
      }
    }

    return bracket;
  }

  // Get tournament status
  getTournamentStatus(tournament) {
    const now = new Date();
    const startTime = new Date(tournament.startTime);
    const endTime = new Date(tournament.endTime);

    if (now < startTime) return 'upcoming';
    if (now >= startTime && now <= endTime) return 'live';
    if (now > endTime) return 'completed';
    return 'unknown';
  }

  // Get user's tournaments
  getUserTournaments() {
    return this.tournaments.filter(tournament => 
      this.participatingTournaments.includes(tournament.id)
    );
  }

  // Get available tournaments
  getAvailableTournaments() {
    return this.tournaments.filter(tournament => 
      !this.participatingTournaments.includes(tournament.id) &&
      this.getTournamentStatus(tournament) === 'upcoming'
    );
  }

  // Get live tournaments
  getLiveTournaments() {
    return this.tournaments.filter(tournament => 
      this.getTournamentStatus(tournament) === 'live'
    );
  }

  // Load tournaments from server
  async loadTournaments() {
    try {
      await this.getTournaments();
    } catch (error) {
      console.error('[TournamentService] Load tournaments error:', error);
    }
  }

  // Save tournaments to storage
  async saveTournaments() {
    try {
      await AsyncStorage.setItem('tournaments', JSON.stringify(this.tournaments));
    } catch (error) {
      console.error('[TournamentService] Save tournaments error:', error);
    }
  }

  // Save participating tournaments to storage
  async saveParticipatingTournaments() {
    try {
      await AsyncStorage.setItem('participatingTournaments', JSON.stringify(this.participatingTournaments));
    } catch (error) {
      console.error('[TournamentService] Save participating tournaments error:', error);
    }
  }

  // Get auth token (deprecated - use api service)
  async getAuthToken() {
    return api.getToken();
  }

  // Subscribe to events
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  // Notify listeners
  notifyListeners(event, data) {
    this.listeners.forEach(callback => callback(event, data));
  }

  // Validate tournament data
  validateTournamentData(data) {
    const errors = [];
    
    if (!data.name || data.name.trim().length < 3) {
      errors.push('Tournament name must be at least 3 characters');
    }
    
    if (!data.gameType) {
      errors.push('Game type is required');
    }
    
    if (!data.startTime) {
      errors.push('Start time is required');
    }
    
    if (!data.endTime) {
      errors.push('End time is required');
    }
    
    if (new Date(data.endTime) <= new Date(data.startTime)) {
      errors.push('End time must be after start time');
    }
    
    if (!data.maxParticipants || data.maxParticipants < 2) {
      errors.push('Maximum participants must be at least 2');
    }
    
    return errors;
  }

  // Get tournament statistics
  getTournamentStats(tournamentId) {
    const tournament = this.tournaments.find(t => t.id === tournamentId);
    if (!tournament) return null;

    return {
      totalParticipants: tournament.participants?.length || 0,
      totalMatches: tournament.matches?.length || 0,
      completedMatches: tournament.matches?.filter(m => m.winner).length || 0,
      currentRound: tournament.currentRound || 1,
      totalRounds: tournament.totalRounds || 1,
      status: this.getTournamentStatus(tournament)
    };
  }
}

export const tournamentService = new TournamentService();
