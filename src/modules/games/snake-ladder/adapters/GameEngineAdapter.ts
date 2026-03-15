import { GameState, GameEvent, GameActionPayload } from '../types';

export interface StateTransitionResult<S extends BaseGameState> {
  nextState: S;
  delta: Partial<S>;
  sideEffects: SideEffect[];
  error?: GameError;
}

export interface BaseGameState {
  roomId: string;
  phase: string;
  players: any[];
}

export interface SideEffect {
  type: string;
  payload: any;
}

export interface GameEngineAdapter<
  S extends BaseGameState,
  E extends GameEvent<GameActionPayload>
> {
  readonly gameId: string;
  readonly displayName: string;
  readonly minPlayers: number;
  readonly maxPlayers: number;
  readonly version: string;

  initialize(roomId: string, playerIds: string[], config?: unknown): S;
  processEvent(state: S, event: E): StateTransitionResult<S>;
  serialize(state: S): string;
  deserialize(raw: string): S;
  getValidActions(state: S, playerId: string): string[];
  isTerminal(state: S): boolean;
  validateConfig(config: unknown): { isValid: boolean; errors: string[] };
  getDefaultConfig(): unknown;
}