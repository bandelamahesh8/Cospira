import { QueueEntry, MatchResult, MatchMode } from '../types/matchmaking';
import { GameType } from '../../src/types/player';
import { v4 as uuidv4 } from 'uuid';

/**
 * Matchmaking Service
 * 
 * Handles player queue management and ELO-based matching.
 * Runs matching algorithm every 2 seconds.
 */
export class MatchmakingService {
  private queues: Map<string, QueueEntry[]>;
  private matchingInterval: NodeJS.Timeout | null;
  private onMatchFound: ((match: MatchResult) => void) | null;

  constructor() {
    this.queues = new Map();
    this.matchingInterval = null;
    this.onMatchFound = null;
  }

  /**
   * Start the matchmaking service
   */
  start(onMatchFound: (match: MatchResult) => void): void {
    this.onMatchFound = onMatchFound;
    this.matchingInterval = setInterval(() => {
      this.findMatches();
    }, 2000); // Run every 2 seconds
    console.log('✅ Matchmaking service started');
  }

  /**
   * Stop the matchmaking service
   */
  stop(): void {
    if (this.matchingInterval) {
      clearInterval(this.matchingInterval);
      this.matchingInterval = null;
    }
    console.log('🛑 Matchmaking service stopped');
  }

  /**
   * Add player to queue
   */
  joinQueue(entry: QueueEntry): void {
    const queueKey = this.getQueueKey(entry.gameType, entry.mode);
    
    if (!this.queues.has(queueKey)) {
      this.queues.set(queueKey, []);
    }

    const queue = this.queues.get(queueKey)!;
    
    // Check if player already in queue
    const existingIndex = queue.findIndex(e => e.playerId === entry.playerId);
    if (existingIndex !== -1) {
      queue[existingIndex] = entry; // Update entry
    } else {
      queue.push(entry);
    }

    console.log(`➕ Player ${entry.playerName} joined ${queueKey} queue (${queue.length} players)`);
  }

  /**
   * Remove player from all queues
   */
  leaveQueue(playerId: string): void {
    let removed = false;
    
    this.queues.forEach((queue, key) => {
      const index = queue.findIndex(e => e.playerId === playerId);
      if (index !== -1) {
        const entry = queue[index];
        queue.splice(index, 1);
        console.log(`➖ Player ${entry.playerName} left ${key} queue (${queue.length} remaining)`);
        removed = true;
      }
    });

    if (!removed) {
      console.log(`⚠️ Player ${playerId} not found in any queue`);
    }
  }

  /**
   * Get queue status for a player
   */
  getQueueStatus(playerId: string, gameType: GameType, mode: MatchMode): {
    inQueue: boolean;
    position?: number;
    playersInQueue?: number;
  } {
    const queueKey = this.getQueueKey(gameType, mode);
    const queue = this.queues.get(queueKey);

    if (!queue) {
      return { inQueue: false };
    }

    const position = queue.findIndex(e => e.playerId === playerId);
    
    if (position === -1) {
      return { inQueue: false };
    }

    return {
      inQueue: true,
      position: position + 1,
      playersInQueue: queue.length,
    };
  }

  /**
   * Find matches in all queues
   */
  private findMatches(): void {
    this.queues.forEach((queue, queueKey) => {
      if (queue.length < 2) return;

      const [gameType, mode] = queueKey.split('_') as [GameType, MatchMode];
      this.findMatchesInQueue(queue, gameType, mode);
    });
  }

  /**
   * Find matches within a specific queue
   */
  private findMatchesInQueue(queue: QueueEntry[], gameType: GameType, mode: MatchMode): void {
    for (let i = 0; i < queue.length - 1; i++) {
      const player1 = queue[i];
      const waitTime = (Date.now() - player1.joinedAt) / 1000; // seconds

      for (let j = i + 1; j < queue.length; j++) {
        const player2 = queue[j];

        if (this.canMatch(player1, player2, waitTime, mode)) {
          // Create match
          const match: MatchResult = {
            roomId: `cnt-${uuidv4()}`,
            player1,
            player2,
            gameType,
            mode,
          };

          // Remove players from queue
          queue.splice(j, 1);
          queue.splice(i, 1);

          console.log(`🎮 Match found: ${player1.playerName} vs ${player2.playerName} (${gameType} ${mode})`);

          // Notify via callback
          if (this.onMatchFound) {
            this.onMatchFound(match);
          }

          return; // Exit after finding one match
        }
      }
    }
  }

  /**
   * Check if two players can be matched
   */
  private canMatch(
    player1: QueueEntry,
    player2: QueueEntry,
    waitTime: number,
    mode: MatchMode
  ): boolean {
    // Casual mode: instant match
    if (mode === 'casual') {
      return true;
    }

    // Ranked mode: ELO-based matching
    const baseRange = 100;
    const expansion = Math.min(500, Math.floor(waitTime / 10) * 20);
    const range = baseRange + expansion;

    const eloDiff = Math.abs(player1.elo - player2.elo);
    const canMatch = eloDiff <= range;

    if (canMatch) {
      console.log(`✅ ELO match: ${player1.elo} vs ${player2.elo} (diff: ${eloDiff}, range: ${range})`);
    }

    return canMatch;
  }

  /**
   * Get queue key for map
   */
  private getQueueKey(gameType: GameType, mode: MatchMode): string {
    return `${gameType}_${mode}`;
  }

  /**
   * Get all queue stats (for debugging)
   */
  getQueueStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    this.queues.forEach((queue, key) => {
      stats[key] = queue.length;
    });
    return stats;
  }
}

// Singleton instance
export const matchmakingService = new MatchmakingService();
