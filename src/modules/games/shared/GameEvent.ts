/**
 * Standard game event structure used for realtime synchronization.
 *
 * This matches the contract described in the Connect4 production prompt.
 */

export type GameAction =
  | 'REQUEST_MOVE'
  | 'MOVE_APPLIED'
  | 'MOVE_REJECTED'
  | 'GAME_WIN'
  | 'GAME_DRAW'
  | 'GAME_RESET'
  | 'PLAYER_JOINED'
  | 'PLAYER_LEFT';

export type GamePayload = Record<string, unknown>;

export interface GameEvent {
  type: 'GAME_EVENT';
  game: string;
  roomId: string;
  senderId: string;
  sequenceId: number;
  timestamp: number;
  action: GameAction;
  payload: GamePayload;
}
