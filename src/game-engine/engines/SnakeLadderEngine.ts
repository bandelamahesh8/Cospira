import { BaseGameEngine } from '../core/BaseGameEngine';
import {
  GameState,
  Move,
  Player,
  ValidationResult,
  WinnerResult,
} from '../core/GameEngine.interface';

interface SnakeLadderBoard {
  playerPositions: Record<string, number>; // playerId -> position (1-100)
  diceValue: number | null;
  snakes: Record<number, number>; // head -> tail
  ladders: Record<number, number>; // bottom -> top
}

/**
 * Snakes & Ladders Game Engine
 *
 * Implements the universal GameEngine interface for Snakes & Ladders.
 * Standard 100-square board with predefined snakes and ladders.
 */
export class SnakeLadderEngine extends BaseGameEngine {
  private readonly BOARD_SIZE = 100;

  // Helper to generate random board
  private generateBoard(): { snakes: Record<number, number>; ladders: Record<number, number> } {
    const snakes: Record<number, number> = {};
    const ladders: Record<number, number> = {};
    const usedStartPositions = new Set<number>();
    const usedEndPositions = new Set<number>();

    // Helper to check if position is valid
    const isValid = (pos: number) => pos > 1 && pos < 100;

    // Generate Snakes (Head > Tail)
    let snakesCount = 0;
    while (snakesCount < 8) {
      const head = Math.floor(Math.random() * 80) + 20; // 20-99
      const tail = Math.floor(Math.random() * (head - 10)) + 2; // Below head

      if (
        isValid(head) &&
        isValid(tail) &&
        !usedStartPositions.has(head) &&
        !usedEndPositions.has(tail) &&
        !usedStartPositions.has(tail) && // Avoid chains
        head !== tail
      ) {
        snakes[head] = tail;
        usedStartPositions.add(head);
        usedEndPositions.add(tail);
        snakesCount++;
      }
    }

    // Generate Ladders (Bottom < Top)
    let laddersCount = 0;
    let attempts = 0;
    while (laddersCount < 8 && attempts < 1000) {
      attempts++;
      const bottom = Math.floor(Math.random() * 80) + 2; // 2-82
      const top = Math.floor(Math.random() * (99 - bottom)) + bottom + 1; // Above bottom

      if (
        isValid(bottom) &&
        isValid(top) &&
        !usedStartPositions.has(bottom) &&
        !usedEndPositions.has(top) &&
        !usedEndPositions.has(bottom) && // Avoid chains (snake tail != ladder bottom)
        !usedStartPositions.has(top) && // Avoid loops (ladder top != snake head)
        bottom !== top
      ) {
        ladders[bottom] = top;
        usedStartPositions.add(bottom);
        usedEndPositions.add(top);
        laddersCount++;
      }
    }

    return { snakes, ladders };
  }

  initGame(players: Player[]): GameState {
    if (players.length < 2 || players.length > 4) {
      throw new Error('Snakes & Ladders requires 2-4 players');
    }

    const playerPositions: Record<string, number> = {};
    players.forEach((player) => {
      playerPositions[player.id] = 0; // Start at position 0
    });

    const { snakes, ladders } = this.generateBoard();

    const board: SnakeLadderBoard = {
      playerPositions,
      diceValue: null,
      snakes,
      ladders,
    };

    const gameState: GameState = {
      id: this.generateGameId(),
      type: 'snakeladder',
      players,
      currentTurn: players[0].id,
      status: 'active',
      winner: null,
      board,
      metadata: {
        moveHistory: [],
        rollCount: 0,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.state = gameState;
    return gameState;
  }

  validateMove(move: Move, state: GameState): ValidationResult {
    // Check if it's the player's turn
    if (move.playerId !== state.currentTurn) {
      return { valid: false, reason: 'Not your turn' };
    }

    if (move.type === 'roll') {
      return { valid: true };
    }

    return { valid: false, reason: 'Invalid move type' };
  }

  applyMove(move: Move, state: GameState): GameState {
    const board = { ...(state.board as SnakeLadderBoard) };
    const playerPositions = { ...board.playerPositions };
    const metadata = { ...state.metadata };

    // Initialize powerups if missing (migration)
    if (!metadata.playerPowerUps) {
      metadata.playerPowerUps = {};
      state.players.forEach(
        (p) =>
          (metadata.playerPowerUps[p.id] = [
            { id: 'shield', name: 'Shield', count: 1 },
            { id: 'extra_roll', name: 'Extra Dice', count: 1 },
          ])
      );
    }

    if (move.type === 'use-powerup') {
      const { powerUpId } = move.data;
      const playerPowerUps = metadata.playerPowerUps[move.playerId] || [];
      const puIndex = playerPowerUps.findIndex((p: any) => p.id === powerUpId && p.count > 0);

      if (puIndex !== -1) {
        // Consume powerup
        playerPowerUps[puIndex].count--;

        // Apply Effect
        if (powerUpId === 'shield') {
          metadata.activeEffects = {
            ...(metadata.activeEffects || {}),
            [move.playerId]: {
              ...((metadata.activeEffects || {})[move.playerId] || {}),
              shield: true,
            },
          };
        }
        if (powerUpId === 'extra_roll') {
          // Next turn will be same player
          metadata.extraRollPending = true;
        }

        return {
          ...state,
          metadata,
          updatedAt: new Date(),
        };
      }
    }

    if (move.type === 'roll') {
      const diceValue = Math.floor(Math.random() * 6) + 1;
      board.diceValue = diceValue;

      let newPosition = playerPositions[move.playerId] + diceValue;
      let effectTriggered = null;

      // Can't go beyond 100
      if (newPosition > this.BOARD_SIZE) {
        newPosition = playerPositions[move.playerId];
      } else {
        // Check for snake
        if (board.snakes[newPosition]) {
          const hasShield = metadata.activeEffects?.[move.playerId]?.shield;
          if (hasShield) {
            // Shield protects!
            effectTriggered = 'SHIELD_USED';
            // Consume shield (single use for one snake hit? or one turn? Let's say one snake hit)
            metadata.activeEffects[move.playerId].shield = false;
          } else {
            newPosition = board.snakes[newPosition];
            effectTriggered = 'SNAKE';
          }
        }
        // Check for ladder
        else if (board.ladders[newPosition]) {
          newPosition = board.ladders[newPosition];
          effectTriggered = 'LADDER';
        }
      }

      playerPositions[move.playerId] = newPosition;

      // Determine Turn
      let nextTurn = this.getNextPlayer(state);
      if (metadata.extraRollPending) {
        nextTurn = move.playerId; // Same player
        metadata.extraRollPending = false;
        effectTriggered = 'EXTRA_ROLL';
      }

      const newState: GameState = {
        ...state,
        board: { ...board, playerPositions, diceValue },
        currentTurn: nextTurn,
        metadata: {
          ...metadata,
          rollCount: state.metadata.rollCount + 1,
          lastAction: { type: 'MOVE', playerId: move.playerId, effect: effectTriggered },
          moveHistory: [
            ...state.metadata.moveHistory,
            // ... history push
          ],
        },
        updatedAt: new Date(),
      };

      // Check for winner
      const winnerCheck = this.checkWinner(newState);
      if (winnerCheck.finished) {
        newState.status = 'finished';
        newState.winner = winnerCheck.winner;
      }

      this.state = newState;
      return newState;
    }

    return state;
  }

  checkWinner(state: GameState): WinnerResult {
    const board = state.board as SnakeLadderBoard;

    // Check if any player reached position 100
    for (const player of state.players) {
      if (board.playerPositions[player.id] === this.BOARD_SIZE) {
        return { finished: true, winner: player.id };
      }
    }

    return { finished: false, winner: null };
  }

  getValidMoves(state: GameState): Move[] {
    return [
      {
        playerId: state.currentTurn,
        type: 'roll',
        data: {},
        timestamp: Date.now(),
      },
    ];
  }

  /**
   * Get snake or ladder at position
   */
  getSpecialSquare(position: number): { type: 'snake' | 'ladder'; to: number } | null {
    const board = this.state.board as SnakeLadderBoard;
    if (board?.snakes && board.snakes[position]) {
      return { type: 'snake', to: board.snakes[position] };
    }
    if (board?.ladders && board.ladders[position]) {
      return { type: 'ladder', to: board.ladders[position] };
    }
    return null;
  }
}
