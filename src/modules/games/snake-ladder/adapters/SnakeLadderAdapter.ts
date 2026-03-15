/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import {
  GameEngineAdapter,
  StateTransitionResult,
  BaseGameState,
  SideEffect,
} from './GameEngineAdapter';
import { GameState, GameEvent, GameActionPayload, PlayerId } from '../types';
import { SnakeLadderEngine } from '../engine/SnakeLadderEngine';
import { validateBoardConfig, DEFAULT_SNAKES, DEFAULT_LADDERS } from '../engine/SnakeLadderRules';
import { GameError } from '../errors/GameError';

export class SnakeLadderAdapter implements GameEngineAdapter<
  GameState,
  GameEvent<GameActionPayload>
> {
  readonly gameId = 'snake_ladder';
  readonly displayName = 'Snake & Ladder';
  readonly minPlayers = 2;
  readonly maxPlayers = 4;
  readonly version = '1.0.0';

  initialize(roomId: string, playerIds: PlayerId[], config?: unknown): GameState {
    const boardConfig = (config as any) || {
      snakes: DEFAULT_SNAKES,
      ladders: DEFAULT_LADDERS,
      totalCells: 100,
    };
    const validation = validateBoardConfig(boardConfig);
    if (!validation.isValid) {
      throw new GameError('BOARD_CONFIG_INVALID', validation.errors.join(', '));
    }

    const players = playerIds.map((id) => ({
      id,
      displayName: `Player ${id}`,
      position: 0,
      isSpectator: false,
      tokenColor: '#ff0000', // assign colors
      rollHistory: [],
      consecutiveSixes: 0,
      joinTimestamp: Date.now(),
      isConnected: true,
      lastActivityAt: Date.now(),
    }));

    return {
      roomId,
      hostId: playerIds[0],
      players,
      boardConfig,
      currentPlayerId: playerIds[0],
      phase: 'WAITING',
      turnCount: 0,
      winnerId: null,
      sequenceId: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  processEvent(
    state: GameState,
    event: GameEvent<GameActionPayload>
  ): StateTransitionResult<GameState> {
    // Implement based on action
    // For REQUEST_ROLL, process roll
    const engine = new SnakeLadderEngine(state);
    if (event.action === 'REQUEST_ROLL') {
      const { diceValue, delta } = engine.processRoll(event.senderId);
      return {
        nextState: engine.getState(),
        delta,
        sideEffects: [{ type: 'ROLL_RESULT', payload: { diceValue, delta } }],
      };
    }
    return {
      nextState: state,
      delta: {},
      sideEffects: [],
    };
  }

  serialize(state: GameState): string {
    return JSON.stringify(state);
  }

  deserialize(raw: string): GameState {
    return JSON.parse(raw);
  }

  getValidActions(state: GameState, playerId: PlayerId): string[] {
    if (state.phase === 'ACTIVE' && state.currentPlayerId === playerId) {
      return ['REQUEST_ROLL'];
    }
    return [];
  }

  isTerminal(state: GameState): boolean {
    return state.phase === 'COMPLETE';
  }

  validateConfig(config: unknown): { isValid: boolean; errors: string[] } {
    return validateBoardConfig(config as any);
  }

  getDefaultConfig(): unknown {
    return {
      snakes: DEFAULT_SNAKES,
      ladders: DEFAULT_LADDERS,
      totalCells: 100,
    };
  }
}
