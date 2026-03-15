/**
 * Core Game State Types for Carrom Multiplayer
 *
 * All state must be serializable for network transmission.
 * Physics values use fixed-point arithmetic for determinism.
 */

import { FixedVector2 } from '../fixed-point';

/** Fixed-point number (integer = real value * 1000) */
export type FixedPoint = number;

/** Player identifier */
export type PlayerId = string;

/** Room identifier */
export type RoomId = string;

/** Sequence identifier for event ordering */
export type SequenceId = number;

/** Game phase states */
export type GamePhase = 'waiting' | 'playing' | 'paused' | 'finished';

/** Coin types */
export type CoinType = 'white' | 'black' | 'queen' | 'striker';

/** Queen status tracking */
export type QueenStatus =
  | 'on_board'
  | 'pocketed_needs_cover'  // queen pocketed, awaiting cover coin this turn
  | 'covered'               // queen successfully covered, scored
  | 'returned';             // queen returned to board after failed cover

/** Coin assignment (which color each player controls) */
export type CoinAssignment = Record<PlayerId, 'white' | 'black' | 'none'>;

/** Pocket positions on the board */
export interface Pocket {
  /** Pocket center position (fixed-point) */
  position: FixedVector2;
  /** Pocket radius (fixed-point) */
  radius: number;
  /** Pocket identifier */
  id: number;
}

/** Physics body representing a game object */
export interface PhysicsBody {
  /** Unique identifier */
  id: string;
  /** Object type */
  type: CoinType;
  /** Position (fixed-point) */
  position: FixedVector2;
  /** Velocity (fixed-point) */
  velocity: FixedVector2;
  /** Angular velocity (fixed-point) */
  angularVelocity: number;
  /** Whether object has been pocketed */
  pocketed: boolean;
  /** Radius (fixed-point) */
  radius: number;
  /** Mass (fixed-point) */
  mass: number;
  /** Restitution/bounciness (fixed-point) */
  restitution: number;
  /** Linear drag (fixed-point) */
  linearDrag: number;
  /** Angular drag (fixed-point) */
  angularDrag: number;
}

/** Board configuration */
export interface BoardConfig {
  /** Board width (fixed-point) */
  width: number;
  /** Board height (fixed-point) */
  height: number;
  /** Wall thickness (fixed-point) */
  wallThickness: number;
  /** Pocket configurations */
  pockets: Pocket[];
  /** Striker placement baseline Y position (fixed-point) */
  strikerBaselineY: number;
  /** Striker placement X range (fixed-point) */
  strikerXRange: { min: number; max: number };
}

/** Player state in the game */
export interface PlayerState {
  id: PlayerId;
  score: number;
  /** Coins remaining on board that belong to this player */
  remainingCoins: number;
  isAI: boolean;
  /** Wall-clock ms when player joined room (used for host migration) */
  joinTimestamp: number;
  /** Whether this player is currently connected */
  connected: boolean;
}

/** Player input state */
export interface PlayerInput {
  /** Player identifier */
  playerId: PlayerId;
  /** Input type */
  type: 'drag_start' | 'drag_update' | 'drag_end';
  /** Drag start position (fixed-point) */
  startPosition?: FixedVector2;
  /** Current drag position (fixed-point) */
  currentPosition?: FixedVector2;
  /** Drag vector magnitude (fixed-point) */
  dragMagnitude?: number;
  /** Drag angle in radians (fixed-point) */
  dragAngle?: number;
  /** Timestamp of input */
  timestamp: number;
}

/** Complete game state */
export interface CarromGameState {
  /** Unique room ID */
  roomId: RoomId;
  /** Current game phase */
  phase: GamePhase;
  /** Current active player ID */
  currentPlayer: PlayerId;
  /** List of player states */
  players: PlayerState[];
  /** Time remaining in seconds */
  timeRemaining: number;
  /** Physics simulation state */
  physics: {
    /** Striker body */
    striker: PhysicsBody;
    /** All coin bodies (white, black, queen) */
    coins: PhysicsBody[];
  };
  /** Board configuration */
  board: BoardConfig;
  /** Status of the queen */
  queenStatus: QueenStatus;
  /** Color assignments for each player */
  coinAssignment: CoinAssignment;
  /** Autoritative host ID */
  hostId: PlayerId;
  /** Monotonically increasing sequence ID */
  sequenceId: SequenceId;
  /** State hash for desync detection */
  stateHash: string;
  /** Last processed input timestamp */
  lastInputTimestamp: number;
  /** Game start timestamp */
  gameStartTimestamp: number;
  /** Winner if game finished */
  winner?: PlayerId;
  /** Reason for game end */
  endReason?: 'time_up' | 'all_coins_pocketed' | 'forfeit';
}

/** Game event types for UI and sound */
export type GameEventType =
  | 'PLAYER_SHOT'
  | 'SHOT_RESULT'
  | 'COIN_POCKETED'
  | 'TURN_SWITCH'
  | 'FOUL'
  | 'QUEEN_POCKETED'
  | 'QUEEN_COVERED'
  | 'QUEEN_RETURNED'
  | 'GAME_OVER'
  | 'HOST_MIGRATED'
  | 'STATE_SYNC'
  | 'DESYNC_DETECTED'
  | 'TIMER_UPDATE'
  | 'GAME_STARTED';

/** Game event object */
export interface GameEvent {
  type: GameEventType;
  payload: any;
  senderId?: PlayerId;
  sequenceId?: SequenceId;
  timestamp: number;
}