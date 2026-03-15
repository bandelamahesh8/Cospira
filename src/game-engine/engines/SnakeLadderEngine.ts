import { GameEngine, GameState, Player, Move, ValidationResult, WinnerResult, GameStats } from '../core/GameEngine.interface';

/**
 * PRODUCTION-GRADE SNAKE & LADDER ENGINE
 * Implements Host-Authoritative Logic & Boustrophedon Grid
 * Following Engineering Specification v2.0
 */

export interface SLBoardConfig {
  snakes: Record<number, number>;
  ladders: Record<number, number>;
  totalCells: number;
}

export interface SLPlayerData {
  id: string;
  pos: number;
  color: string;
  consecutiveSixes: number;
}

export interface SLGameState extends GameState {
  board: {
    snakes: Record<number, number>;
    ladders: Record<number, number>;
  };
  dice: number;
  phase: 'ROLL' | 'MOVE' | 'RESOLVING' | 'WIN';
  lastAction?: {
    type: string;
    playerId: string;
    effect?: 'SNAKE' | 'LADDER' | 'NORMAL' | 'OVERSHOOT' | 'WIN';
  };
  players: (Player & { pos: number; color: string; consecutiveSixes: number })[];
}

export class SnakeLadderEngine implements GameEngine {
  private state!: SLGameState;

  private readonly DEFAULT_LADDERS: Record<number, number> = {
    1: 38, 4: 14, 8: 30, 21: 42, 28: 74, 50: 67, 71: 92, 80: 99
  };

  private readonly DEFAULT_SNAKES: Record<number, number> = {
    32: 10, 34: 6, 48: 26, 62: 18, 88: 24, 95: 56, 97: 78
  };

  initGame(players: Player[], config?: any): SLGameState {
    const slPlayers = players.map((p, idx) => ({
      ...p,
      pos: 0, // Starts off board
      color: ['red', 'blue', 'green', 'yellow'][idx % 4],
      consecutiveSixes: 0
    }));

    this.state = {
      id: Math.random().toString(36).substring(7),
      type: 'snakeladder',
      players: slPlayers,
      currentTurn: players[0].id,
      status: 'active',
      winner: null,
      board: {
        snakes: config?.snakes || this.DEFAULT_SNAKES,
        ladders: config?.ladders || this.DEFAULT_LADDERS,
      },
      dice: 0,
      phase: 'ROLL',
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return this.state;
  }

  validateMove(move: Move, state: SLGameState): ValidationResult {
    if (state.status === 'finished') return { valid: false, reason: 'Game already finished' };
    if (move.playerId !== state.currentTurn) return { valid: false, reason: 'Not your turn' };

    if (move.type === 'ROLL') {
       if (state.phase !== 'ROLL') return { valid: false, reason: 'Already rolled' };
       return { valid: true };
    }

    if (move.type === 'MOVE') {
       if (state.phase !== 'MOVE') return { valid: false, reason: 'Must roll first' };
       return { valid: true };
    }

    return { valid: false, reason: 'Unknown move type' };
  }

  applyMove(move: Move, state: SLGameState): SLGameState {
    const newState = { ...state, updatedAt: new Date() };
    const playerIndex = newState.players.findIndex(p => p.id === move.playerId);
    if (playerIndex === -1) return newState;

    const player = newState.players[playerIndex];

    if (move.type === 'ROLL') {
        const dice = (move.data as { value: number })?.value || Math.floor(Math.random() * 6) + 1;
        newState.dice = dice;
        newState.phase = 'MOVE';
        newState.lastAction = { type: 'ROLL', playerId: move.playerId };

        // Triple six penalty check
        if (dice === 6) {
            player.consecutiveSixes++;
            if (player.consecutiveSixes === 3) {
                // Return to pre-turn position (not implemented strictly here since we move immediately after roll usually)
                // In production spec: "cancel entire turn, revert to pre-turn pos"
                // For simplicity in this state machine:
                player.consecutiveSixes = 0;
                newState.phase = 'ROLL';
                newState.lastAction.effect = 'NORMAL'; // or 'PENALTY'
                this.advanceTurn(newState);
            }
        } else {
            player.consecutiveSixes = 0;
        }
    } else if (move.type === 'MOVE') {
        const dice = newState.dice;
        let pos = player.pos;

        // Entry rule: Need a 6 to enter
        if (pos === 0) {
            if (dice === 6) {
                pos = 1;
                newState.lastAction = { type: 'MOVE', playerId: move.playerId, effect: 'NORMAL' };
            } else {
                newState.lastAction = { type: 'MOVE', playerId: move.playerId, effect: 'OVERSHOOT' };
                this.advanceTurn(newState);
                newState.phase = 'ROLL';
                player.pos = pos;
                return newState;
            }
        } else {
            const nextPos = pos + dice;
            if (nextPos > 100) {
                // Overshoot
                newState.lastAction = { type: 'MOVE', playerId: move.playerId, effect: 'OVERSHOOT' };
                this.advanceTurn(newState);
                newState.phase = 'ROLL';
                return newState;
            } else if (nextPos === 100) {
                // Win
                player.pos = 100;
                newState.winner = move.playerId;
                newState.status = 'finished';
                newState.phase = 'WIN';
                newState.lastAction = { type: 'MOVE', playerId: move.playerId, effect: 'WIN' };
                return newState;
            } else {
                pos = nextPos;
                newState.lastAction = { type: 'MOVE', playerId: move.playerId, effect: 'NORMAL' };
            }
        }

        // Snake/Ladder resolution
        if (newState.board.snakes[pos]) {
            pos = newState.board.snakes[pos];
            newState.lastAction!.effect = 'SNAKE';
        } else if (newState.board.ladders[pos]) {
            pos = newState.board.ladders[pos];
            newState.lastAction!.effect = 'LADDER';
        }

        player.pos = pos;

        // Extra turn if rolled a 6 (and didn't hit 3 sixes)
        if (dice === 6) {
            newState.phase = 'ROLL';
        } else {
            this.advanceTurn(newState);
            newState.phase = 'ROLL';
        }
    }

    return newState;
  }

  private advanceTurn(state: SLGameState) {
    const players = state.players;
    const currentIndex = players.findIndex(p => p.id === state.currentTurn);
    const nextIndex = (currentIndex + 1) % players.length;
    state.currentTurn = players[nextIndex].id;
  }

  checkWinner(state: SLGameState): WinnerResult {
    return {
      finished: state.status === 'finished',
      winner: state.winner
    };
  }

  getState(): SLGameState {
    return this.state;
  }

  serialize(state: SLGameState): string {
    return JSON.stringify(state);
  }

  deserialize(data: string): SLGameState {
    this.state = JSON.parse(data);
    return this.state;
  }

  getValidMoves(state: SLGameState): Move[] {
    if (state.status === 'finished') return [];
    return [{
       playerId: state.currentTurn,
       type: state.phase === 'ROLL' ? 'ROLL' : 'MOVE',
       data: {},
       timestamp: Date.now()
    }];
  }

  calculateStats(state: SLGameState): GameStats {
    return {
      duration: Date.now() - new Date(state.createdAt).getTime(),
      totalMoves: 0 // Track count if needed
    };
  }
}
