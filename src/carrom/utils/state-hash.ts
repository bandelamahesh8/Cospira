/**
 * State Hashing for Desync Detection
 *
 * Uses xxHash (fast non-cryptographic hash) to create deterministic
 * hashes of game state for detecting desynchronization between
 * host and client simulations.
 */

import XXH from 'xxhashjs';
import { CarromGameState } from '../types/game-state';

// Use 64-bit xxHash for good collision resistance
const HASHER = XXH.h64(0xcafebabe); // Fixed seed for determinism

/**
 * Creates a deterministic hash of the game state
 * @param state - The game state to hash
 * @returns Hex string representation of the hash
 */
export function hashGameState(state: CarromGameState): string {
  // Create a canonical string representation of the state
  const stateString = serializeStateForHash(state);

  // Hash the string
  const hash = HASHER.update(stateString).digest();

  // Convert to hex string
  return hash.toString(16).padStart(16, '0');
}

/**
 * Serializes game state to a deterministic string for hashing
 * Order of serialization must be consistent across all clients
 */
function serializeStateForHash(state: CarromGameState): string {
  const parts: string[] = [];

  // Basic state
  parts.push(`phase:${state.phase}`);
  parts.push(`currentPlayer:${state.currentPlayer}`);
  parts.push(`scores:${state.scores.player1},${state.scores.player2}`);
  parts.push(`timeRemaining:${state.timeRemaining}`);
  parts.push(`lastInputTimestamp:${state.lastInputTimestamp}`);
  parts.push(`gameStartTimestamp:${state.gameStartTimestamp}`);

  if (state.winner) {
    parts.push(`winner:${state.winner}`);
  }
  if (state.endReason) {
    parts.push(`endReason:${state.endReason}`);
  }

  // Physics state - striker
  const striker = state.physics.striker;
  parts.push(
    `striker:id=${striker.id},pos=${striker.position.x},${striker.position.y},vel=${striker.velocity.x},${striker.velocity.y},angVel=${striker.angularVelocity},pocketed=${striker.pocketed}`
  );

  // Physics state - coins (sorted by ID for determinism)
  const sortedCoins = [...state.physics.coins].sort((a, b) => a.id.localeCompare(b.id));
  sortedCoins.forEach((coin) => {
    parts.push(
      `coin:id=${coin.id},type=${coin.type},pos=${coin.position.x},${coin.position.y},vel=${coin.velocity.x},${coin.velocity.y},angVel=${coin.angularVelocity},pocketed=${coin.pocketed}`
    );
  });

  // Board configuration (should be static, but include for completeness)
  parts.push(
    `board:width=${state.board.width},height=${state.board.height},wallThickness=${state.board.wallThickness}`
  );
  parts.push(`board:strikerBaselineY=${state.board.strikerBaselineY}`);
  parts.push(
    `board:strikerXRange=${state.board.strikerXRange.min},${state.board.strikerXRange.max}`
  );

  // Pockets (sorted by ID)
  const sortedPockets = [...state.board.pockets].sort((a, b) => a.id - b.id);
  sortedPockets.forEach((pocket) => {
    parts.push(
      `pocket:id=${pocket.id},pos=${pocket.position.x},${pocket.position.y},radius=${pocket.radius}`
    );
  });

  // Join all parts with consistent separator
  return parts.join('|');
}

/**
 * Compares two state hashes
 * @param hash1 - First hash
 * @param hash2 - Second hash
 * @returns True if hashes match
 */
export function compareStateHashes(hash1: string, hash2: string): boolean {
  return hash1 === hash2;
}

/**
 * Validates that a state matches its expected hash
 * @param state - Game state
 * @param expectedHash - Expected hash string
 * @returns True if state hash matches expected
 */
export function validateStateHash(state: CarromGameState, expectedHash: string): boolean {
  const actualHash = hashGameState(state);
  return compareStateHashes(actualHash, expectedHash);
}

/**
 * Creates a rolling hash for continuous state monitoring
 * Useful for detecting when desync first occurs
 */
export class RollingStateHash {
  private hashes: string[] = [];
  private maxHistory = 10; // Keep last 10 hashes

  /**
   * Adds a new state hash to the rolling history
   */
  addHash(hash: string): void {
    this.hashes.push(hash);
    if (this.hashes.length > this.maxHistory) {
      this.hashes.shift();
    }
  }

  /**
   * Gets the most recent hash
   */
  getLatestHash(): string | null {
    return this.hashes[this.hashes.length - 1] || null;
  }

  /**
   * Gets all hashes in history
   */
  getHashHistory(): string[] {
    return [...this.hashes];
  }

  /**
   * Clears the hash history
   */
  clear(): void {
    this.hashes = [];
  }
}

/**
 * Desync detection result
 */
export interface DesyncResult {
  isDesynced: boolean;
  clientHash: string;
  serverHash: string;
  timestamp: number;
}

/**
 * Detects desync between client and server states
 * @param clientState - Client's current state
 * @param serverHash - Server's state hash
 * @returns Desync detection result
 */
export function detectDesync(clientState: CarromGameState, serverHash: string): DesyncResult {
  const clientHash = hashGameState(clientState);
  const isDesynced = !compareStateHashes(clientHash, serverHash);

  return {
    isDesynced,
    clientHash,
    serverHash,
    timestamp: Date.now(),
  };
}
