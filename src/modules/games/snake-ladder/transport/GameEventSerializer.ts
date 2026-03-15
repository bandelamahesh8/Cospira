import { PlayerId, ISOTimestamp } from '../types';

export interface GameEvent<T extends GameActionPayload> {
  version: '1.0';
  type: 'GAME_EVENT';
  game: 'snake_ladder';
  roomId: string;
  senderId: PlayerId;
  sequenceId: number;
  timestamp: ISOTimestamp;
  action: GameAction;
  payload: T;
  hmac?: string;
  traceId: string;
}

export type GameAction =
  | 'REQUEST_ROLL'
  | 'ROLL_RESULT'
  | 'SNAKE_BITE'
  | 'LADDER_CLIMB'
  | 'OVERSHOOT'
  | 'TURN_SKIPPED'
  | 'TURN_CANCELLED'
  | 'PLAYER_JOINED'
  | 'PLAYER_LEFT'
  | 'PLAYER_RECONNECTED'
  | 'GAME_WIN'
  | 'GAME_RESET'
  | 'HOST_MIGRATED'
  | 'KEY_ROTATED'
  | 'STATE_SYNC'
  | 'GAME_ERROR'
  | 'HMAC_VERIFICATION_FAILED';

export type GameActionPayload = Record<string, unknown>; // Specific payloads defined per action

export class GameEventSerializer {
  static serialize<T extends GameActionPayload>(event: GameEvent<T>): string {
    return JSON.stringify(event);
  }

  static deserialize(data: string): GameEvent<any> {
    return JSON.parse(data);
  }
}
