import { ELO_CONFIG, getRankFromElo, ELOResult } from '@/types/player';

/**
 * ELO Rating Service
 *
 * Implements the ELO rating system for competitive matchmaking.
 * Based on the standard ELO formula with configurable K-factor.
 */
export class ELOService {
  private kFactor: number;

  constructor(kFactor: number = ELO_CONFIG.K_FACTOR) {
    this.kFactor = kFactor;
  }

  /**
   * Calculate expected score for a player
   * @param playerElo - Player's current ELO
   * @param opponentElo - Opponent's current ELO
   * @returns Expected score (0-1)
   */
  private calculateExpectedScore(playerElo: number, opponentElo: number): number {
    return 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
  }

  /**
   * Calculate new ELO rating after a match
   * @param playerElo - Player's current ELO
   * @param opponentElo - Opponent's current ELO
   * @param result - Match result: 'win' | 'loss' | 'draw'
   * @returns New ELO and rank
   */
  calculateNewELO(
    playerElo: number,
    opponentElo: number,
    result: 'win' | 'loss' | 'draw'
  ): ELOResult {
    const expected = this.calculateExpectedScore(playerElo, opponentElo);
    const actual = result === 'win' ? 1 : result === 'draw' ? 0.5 : 0;

    const change = Math.round(this.kFactor * (actual - expected));
    const newElo = Math.max(0, playerElo + change); // ELO can't go below 0
    const newRank = getRankFromElo(newElo);

    return {
      newElo,
      change,
      newRank,
    };
  }

  /**
   * Calculate ELO changes for multiple players (e.g., 4-player game)
   * @param players - Array of player ELOs
   * @param rankings - Final rankings (1st, 2nd, 3rd, 4th)
   * @returns Array of ELO results
   */
  calculateMultiplayerELO(players: number[], rankings: number[]): ELOResult[] {
    if (players.length !== rankings.length) {
      throw new Error('Players and rankings arrays must have same length');
    }

    const results: ELOResult[] = [];
    const avgElo = players.reduce((sum, elo) => sum + elo, 0) / players.length;

    for (let i = 0; i < players.length; i++) {
      const playerElo = players[i];
      const ranking = rankings[i];

      // Calculate score based on ranking (1st = 1.0, 2nd = 0.66, 3rd = 0.33, 4th = 0.0)
      const score = (players.length - ranking) / (players.length - 1);

      const expected = this.calculateExpectedScore(playerElo, avgElo);
      const change = Math.round(this.kFactor * (score - expected));
      const newElo = Math.max(0, playerElo + change);
      const newRank = getRankFromElo(newElo);

      results.push({
        newElo,
        change,
        newRank,
      });
    }

    return results;
  }

  /**
   * Get ELO range for matchmaking
   * @param elo - Player's ELO
   * @param waitTime - Time spent waiting (in seconds)
   * @returns Min and max ELO for matching
   */
  getMatchmakingRange(elo: number, waitTime: number = 0): { min: number; max: number } {
    // Base range: ±100 ELO
    let range = 100;

    // Expand range by 20 ELO every 10 seconds of waiting (max 500)
    const expansion = Math.min(500, Math.floor(waitTime / 10) * 20);
    range += expansion;

    return {
      min: Math.max(0, elo - range),
      max: elo + range,
    };
  }

  /**
   * Check if two players are within matchmaking range
   */
  canMatch(player1Elo: number, player2Elo: number, waitTime: number = 0): boolean {
    const range = this.getMatchmakingRange(player1Elo, waitTime);
    return player2Elo >= range.min && player2Elo <= range.max;
  }
}

// Singleton instance
export const eloService = new ELOService();
