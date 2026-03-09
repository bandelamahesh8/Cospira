import { DecisionEngine } from './DecisionEngine';
import { BrainService, PlayerDNA, PlayerPrediction } from './BrainService';

export interface MatchCandidate {
  userId: string;
  elo: number;
  dna?: PlayerDNA;
  prediction?: PlayerPrediction;
}

export class MatchmakingService {
  // Weights from Master Architecture
  private static readonly W_ELO = 0.4;
  private static readonly W_STYLE = 0.3;
  private static readonly W_TOXICITY = 0.2;
  private static readonly W_PREDICTION = 0.1;

  /**
   * Calculates the Elite Match Score (0.0 - 1.0)
   * Higher is better match.
   */
  static calculateMatchScore(p1: MatchCandidate, p2: MatchCandidate): number {
    // 1. Elo Similarity (Normalized 0-1)
    const eloDiff = Math.abs(p1.elo - p2.elo);
    const eloScore = Math.max(0, 1 - eloDiff / 400); // 400 diff = 0 score

    // 2. Style Compatibility
    // Aggressive vs Defensive = Good (1.0)
    // Aggressive vs Aggressive = Chaos (0.4)
    // Defensive vs Defensive = Boring (0.4)
    // Balanced = Neutral (0.7)
    let styleScore = 0.5;
    if (p1.dna && p2.dna) {
      const styles = [p1.dna.play_style, p2.dna.play_style].sort();
      if (styles[0] === 'aggressive' && styles[1] === 'defensive') styleScore = 1.0;
      else if (styles[0] === 'aggressive' && styles[1] === 'aggressive') styleScore = 0.4;
      else if (styles[0] === 'defensive' && styles[1] === 'defensive') styleScore = 0.4;
      else styleScore = 0.7;
    }

    // 3. Toxicity Gap (We want similar toxicity? No, we want low toxicity for good players)
    // But the prompt says "toxicityGap".
    // Actually, usually you segregate toxic players. Small gap = they belong together.
    // Let's assume Small Gap = High Score (0-1).
    let toxicityScore = 1.0;
    if (p1.dna && p2.dna) {
      const gap = Math.abs(p1.dna.toxicity_score - p2.dna.toxicity_score);
      toxicityScore = 1 - gap;
    }

    // 4. Prediction Balance (Tilt Prevention)
    // If P1 is tilting, we want an easy opponent (lower Elo).
    // If prediction says P1 tilt > 0.7, boosting score if P2 Elo < P1 Elo.
    let predictionScore = 0.5;
    if (p1.prediction && p1.prediction.tilt_probability > 0.6) {
      // Tilt active: Prefer P2 with Lower Elo (Easy Match intervention)
      if (p2.elo < p1.elo)
        predictionScore = 1.0; // Good for tilt
      else predictionScore = 0.0; // Bad for tilt
    } else {
      // Normal operation: Equal win probabilities
      // Win prob diff being small is good
      const p1Win = p1.prediction?.win_probability || 0.5;
      const p2Win = p2.prediction?.win_probability || 0.5;
      const winDiff = Math.abs(p1Win - p2Win);
      predictionScore = 1 - winDiff;
    }

    // Weighted Sum
    return (
      eloScore * this.W_ELO +
      styleScore * this.W_STYLE +
      toxicityScore * this.W_TOXICITY +
      predictionScore * this.W_PREDICTION
    );
  }

  /**
   * Simulates finding the best opponent from a pool
   */
  static async findBestMatch(
    userId: string,
    currentElo: number,
    candidates: MatchCandidate[]
  ): Promise<MatchCandidate | null> {
    // Hydrate P1
    const dna = await BrainService.getPlayerDNA(userId);
    const prediction = await BrainService.getPredictions(userId);

    const p1: MatchCandidate = { userId, elo: currentElo, dna, prediction };

    // Check Decision Engine for overrides
    const decision = await DecisionEngine.decide(userId);

    let pool = candidates;

    // Apply Interventions
    if (decision.action === 'TILT_PROTECTION') {
      // Filter pool for easier opponents
      pool = pool.filter((c) => c.elo < currentElo);
    }

    // Score all candidates
    const scored = pool.map((c) => ({
      candidate: c,
      score: this.calculateMatchScore(p1, c),
    }));

    // Sort by Score Descending
    scored.sort((a, b) => b.score - a.score);

    return scored.length > 0 ? scored[0].candidate : null;
  }
}

// ============================================================================
// PUBLIC MATCHMAKING SERVICE (for casual gameplay)
// ============================================================================

export interface PublicMatchRequest {
  userId: string;
  userName: string;
  gameType: string;
  timestamp: number;
}

export interface PublicMatch {
  roomId: string;
  opponent: { id: string; name: string };
  gameType: string;
  createdAt: number;
}

export class PublicMatchmakingService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private socket: any;
  private currentMatch: PublicMatch | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private listeners: Map<string, ((data?: any) => void)[]> = new Map();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(socket: any) {
    this.socket = socket;
    this.setupSocketHandlers();
  }

  /**
   * Initialize socket event handlers for public matchmaking
   */
  private setupSocketHandlers() {
    this.socket?.on('public-match-found', (data: unknown) => {
      this.handleMatchFound(data);
    });
    this.socket?.on('rematch-requested', (data: unknown) => {
      this.emit('rematch-requested', data);
    });
  }

  /**
   * Join public matchmaking queue
   */
  async joinQueue(userId: string, userName: string, gameType: string): Promise<boolean> {
    try {
      this.socket?.emit(
        'matchmaking-join-public',
        { userId, userName, gameType },
        (response: unknown) => {
          const res = response as { success?: boolean; error?: string };
          if (res?.success) {
            this.emit('queue-joined', { userId, gameType });
          } else {
            this.emit('queue-error', res?.error);
          }
        }
      );
      return true;
    } catch (error) {
      console.error('[PublicMatchmakingService] Error joining queue:', error);
      return false;
    }
  }

  /**
   * Leave public matchmaking queue
   */
  async leaveQueue(userId: string): Promise<boolean> {
    try {
      this.socket?.emit('matchmaking-leave-public', { userId });
      this.emit('queue-left');
      return true;
    } catch (error) {
      console.error('[PublicMatchmakingService] Error leaving queue:', error);
      return false;
    }
  }

  /**
   * Handle match found - auto-create room and join
   */
  private handleMatchFound(data: unknown) {
    const { roomId, opponent, gameType } = data as PublicMatch;
    this.currentMatch = {
      roomId,
      opponent,
      gameType,
      createdAt: Date.now(),
    };
    this.emit('match-found', this.currentMatch);
  }

  /**
   * Request rematch
   */
  requestRematch(): void {
    if (!this.currentMatch) return;
    this.socket?.emit('rematch-request', {
      roomId: this.currentMatch.roomId,
      opponentId: this.currentMatch.opponent.id,
      gameType: this.currentMatch.gameType,
    });
    this.emit('rematch-requested');
  }

  /**
   * Accept rematch
   */
  acceptRematch(): void {
    this.socket?.emit('rematch-accept', {
      roomId: this.currentMatch?.roomId,
    });
    this.emit('rematch-accepted');
  }

  /**
   * Decline rematch and find new opponent
   */
  declineRematch(userId: string, userName: string, gameType: string): void {
    this.socket?.emit('rematch-decline', {
      roomId: this.currentMatch?.roomId,
    });
    this.currentMatch = null;
    this.joinQueue(userId, userName, gameType);
    this.emit('rematch-declined');
  }

  /**
   * Get current match
   */
  getCurrentMatch(): PublicMatch | null {
    return this.currentMatch;
  }

  /**
   * Clear match
   */
  clearMatch(): void {
    this.currentMatch = null;
  }

  /**
   * Event system
   */
  private emit(event: string, data?: unknown) {
    const listeners = this.listeners.get(event) || [];
    listeners.forEach((listener) => listener(data));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(event: string, callback: (data?: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  destroy() {
    this.listeners.clear();
    this.currentMatch = null;
  }
}
