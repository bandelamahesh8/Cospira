/**
 * Connect4Engine implements the GameEngineAdapter contract using a host-authoritative model.
 *
 * The engine is responsible for applying moves, validating rules, and detecting wins.
 */

import { GameEngineAdapter, GameConfig, GameMove, ValidationResult, WinResult } from '../shared/GameEngineAdapter';
import { BoardStateManager } from './BoardStateManager';
import { BoardState, Connect4Config, Connect4Move } from './types';
import { MoveValidator } from './MoveValidator';
import { WinDetector } from './WinDetector';

export class Connect4Engine implements GameEngineAdapter {
  public readonly gameId = 'connect4';

  private manager: BoardStateManager;
  private config: Connect4Config | null = null;

  constructor(initialState?: Partial<BoardState>) {
    this.manager = new BoardStateManager(initialState);
  }

  initialize(config: GameConfig): void {
    const players = (config.players || []) as string[];
    if (players.length < 2) {
      console.error('Connect4 requires exactly 2 players, but received:', players.length);
      // We don't throw here to avoid crashing the UI. The engine will be in an invalid state 
      // but the component can handle it or wait for a proper update.
      return;
    }

    const connect4Config: Connect4Config = {
      players: [players[0], players[1]],
      startingPlayer: '1',
      ...((config.settings as Partial<Connect4Config>) || {}),
    };

    this.config = connect4Config;

    this.manager.reset();
    this.manager.setActive();
  }

  applyMove(move: GameMove): BoardState {
    const state = this.manager.getState();
    const validator = this.validateMove(move, state);
    if (!validator.valid) {
      return state;
    }

    const connectMove = move as Connect4Move;
    const playerNum = this.getPlayerNumber(connectMove.playerId);
    if (!playerNum) return state;

    // Drop piece to lowest empty cell in the column
    const grid = state.grid;
    let targetRow = -1;
    for (let r = state.rows - 1; r >= 0; r--) {
      if (grid[r][connectMove.column] === 0) {
        targetRow = r;
        break;
      }
    }

    if (targetRow === -1) {
      return state;
    }

    const nextState = this.manager.applyMove(targetRow, connectMove.column, playerNum);

    const win = this.detectWin(nextState);
    if (win) {
      return this.manager.updateStatus('won', win.winner, win.winningCells);
    }

    const isDraw = nextState.moveCount >= nextState.rows * nextState.cols;
    if (isDraw) {
      return this.manager.updateStatus('draw', null, null);
    }

    return nextState;
  }

  validateMove(move: GameMove, state: BoardState): ValidationResult {
    const connectMove = move as Connect4Move;
    const playerNum = this.getPlayerNumber(connectMove.playerId);
    if (!playerNum) {
      return { valid: false, reason: 'Unknown player.' };
    }
    return MoveValidator.validate(state, connectMove, playerNum);
  }

  detectWin(state: BoardState): WinResult | null {
    return WinDetector.detectWin(state);
  }

  reset(): BoardState {
    const state = this.manager.reset();
    this.manager.setActive();
    return state;
  }

  serialize(): string {
    return JSON.stringify(this.manager.getState());
  }

  deserialize(snapshot: string): BoardState {
    try {
      const parsed = JSON.parse(snapshot) as BoardState;
      this.manager = new BoardStateManager(parsed);
      return this.manager.getState();
    } catch {
      return this.manager.getState();
    }
  }

  private getPlayerNumber(playerId: string): 1 | 2 | null {
    if (!this.config) return null;
    if (playerId === this.config.players[0]) return 1;
    if (playerId === this.config.players[1]) return 2;
    return null;
  }
}
