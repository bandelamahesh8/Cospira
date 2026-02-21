// File: src/services/GameSyncService.ts
// Handles real-time game state synchronization across clients

import { logger } from '@/utils/logger';

export interface GameMove {
  id: string;
  playerId: string;
  playerName: string;
  action: string;
  timestamp: number;
  boardState?: any;
}

export interface GameSyncState {
  isActive: boolean;
  gameType: string | null;
  players: Array<{ id: string; name: string; score: number }>;
  turn: string | null;
  board: any;
  winner: string | null;
  moves: GameMove[];
}

export class GameSyncService {
  private socket: any;
  private roomId: string | null = null;
  private state: GameSyncState;
  private listeners: Map<string, Function[]> = new Map();

  constructor(socket: any) {
    this.socket = socket;
    this.state = {
      isActive: false,
      gameType: null,
      players: [],
      turn: null,
      board: null,
      winner: null,
      moves: [],
    };
  }

  /**
   * Initialize game sync for a room
   */
  initializeForRoom(roomId: string) {
    this.roomId = roomId;
    logger.info(`[GameSyncService] Initialized for room: ${roomId}`);
  }

  /**
   * Start a new game with synchronized state
   */
  startGame(gameType: string, players: Array<{ id: string; name: string }>) {
    if (!this.roomId) {
      logger.warn('[GameSyncService] No room initialized');
      return;
    }

    this.state = {
      isActive: true,
      gameType,
      players: players.map((p) => ({ ...p, score: 0 })),
      turn: players[0]?.id || null,
      board: this.initializeBoard(gameType),
      winner: null,
      moves: [],
    };

    // Broadcast to all participants
    this.socket?.emit('game-started', {
      roomId: this.roomId,
      gameState: this.state,
    });

    this.emit('game-started', this.state);
    logger.info(`[GameSyncService] Game started: ${gameType}`);
  }

  /**
   * Make a game move with validation
   */
  makeMove(playerId: string, action: any): boolean {
    if (!this.state.isActive) {
      logger.warn('[GameSyncService] Game is not active');
      return false;
    }

    if (this.state.turn !== playerId) {
      logger.warn('[GameSyncService] Not your turn');
      return false;
    }

    // Validate move
    if (!this.validateMove(action)) {
      logger.warn('[GameSyncService] Invalid move');
      return false;
    }

    // Create move record
    const move: GameMove = {
      id: crypto.randomUUID(),
      playerId,
      playerName: this.state.players.find((p) => p.id === playerId)?.name || 'Unknown',
      action: JSON.stringify(action),
      timestamp: Date.now(),
    };

    // Update board state
    this.state.board = this.applyMove(this.state.board, action);
    this.state.moves.push(move);

    // Update turn
    const currentPlayerIndex = this.state.players.findIndex((p) => p.id === playerId);
    const nextPlayerIndex = (currentPlayerIndex + 1) % this.state.players.length;
    this.state.turn = this.state.players[nextPlayerIndex]?.id || null;

    // Check for winner
    const winner = this.checkWinner(this.state.board);
    if (winner) {
      this.state.winner = winner;
      this.state.isActive = false;
    }

    // Broadcast move to all participants
    if (this.roomId) {
      this.socket?.emit('game-move', {
        roomId: this.roomId,
        move,
        gameState: this.state,
      });
    }

    this.emit('move-made', { move, gameState: this.state });
    logger.info(`[GameSyncService] Move made by ${playerId}`);
    return true;
  }

  /**
   * Handle incoming game state update from other player
   */
  applyRemoteUpdate(gameState: GameSyncState) {
    this.state = { ...gameState };
    this.emit('state-updated', this.state);
    logger.info('[GameSyncService] Applied remote game state update');
  }

  /**
   * End game and cleanup
   */
  endGame() {
    this.state.isActive = false;
    if (this.roomId) {
      this.socket?.emit('game-ended', {
        roomId: this.roomId,
        winner: this.state.winner,
        finalState: this.state,
      });
    }
    this.emit('game-ended', this.state);
    logger.info('[GameSyncService] Game ended');
  }

  /**
   * Request rematch
   */
  requestRematch(opponentId: string) {
    if (this.roomId) {
      this.socket?.emit('rematch-requested', {
        roomId: this.roomId,
        requestedBy: opponentId,
      });
    }
    logger.info('[GameSyncService] Rematch requested');
  }

  /**
   * Accept rematch
   */
  acceptRematch() {
    if (this.roomId) {
      this.socket?.emit('rematch-accepted', {
        roomId: this.roomId,
      });
    }
    this.emit('rematch-accepted', { roomId: this.roomId });
    logger.info('[GameSyncService] Rematch accepted');
  }

  /**
   * Decline rematch
   */
  declineRematch() {
    if (this.roomId) {
      this.socket?.emit('rematch-declined', {
        roomId: this.roomId,
      });
    }
    this.emit('rematch-declined', { roomId: this.roomId });
    logger.info('[GameSyncService] Rematch declined');
  }

  /**
   * Get current game state
   */
  getState(): GameSyncState {
    return { ...this.state };
  }

  /**
   * Validate if a move is legal
   */
  private validateMove(action: any): boolean {
    // This would be game-specific validation
    // For now, just check that action is not null/undefined
    return action !== null && action !== undefined;
  }

  /**
   * Apply move to board state
   */
  private applyMove(board: any, action: any): any {
    // Game-specific board update logic
    // This is a placeholder
    return { ...board, lastMove: action };
  }

  /**
   * Check for winner
   */
  private checkWinner(_board: any): string | null {
    // Game-specific win condition check
    // This is a placeholder
    return null;
  }

  /**
   * Initialize game board
   */
  private initializeBoard(gameType: string): any {
    // Game-specific board initialization
    return { gameType, createdAt: Date.now() };
  }

  /**
   * Event system
   */
  private emit(event: string, data: any) {
    const listeners = this.listeners.get(event) || [];
    listeners.forEach((listener) => listener(data));
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Cleanup
   */
  destroy() {
    this.listeners.clear();
    this.state = {
      isActive: false,
      gameType: null,
      players: [],
      turn: null,
      board: null,
      winner: null,
      moves: [],
    };
    logger.info('[GameSyncService] Destroyed');
  }
}
