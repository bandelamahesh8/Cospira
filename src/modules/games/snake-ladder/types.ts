export type PlayerId = string;
export type HexColor = `#${string}`;
export type ISOTimestamp = number; // Unix ms

export type GamePhase = 'WAITING' | 'ACTIVE' | 'COMPLETE';

export type MoveOutcome = 'NORMAL' | 'SNAKE' | 'LADDER' | 'WIN' | 'OVERSHOOT' | 'BLOCKED';

export interface PlayerState {
  id: PlayerId;
  displayName: string;
  position: number; // 0 = not yet entered; 1–100 = on board
  isSpectator: boolean;
  tokenColor: HexColor;
  rollHistory: number[];
  consecutiveSixes: number; // reset on non-six; cancel turn at 3
  joinTimestamp: ISOTimestamp;
  isConnected: boolean;
  lastActivityAt: ISOTimestamp;
}

export interface BoardConfig {
  snakes: Record<number, number>; // head → tail  (head > tail, always)
  ladders: Record<number, number>; // base → top   (base < top, always)
  totalCells: number; // default: 100
}

export interface GameState {
  roomId: string;
  hostId: PlayerId;
  players: PlayerState[];
  boardConfig: BoardConfig;
  currentPlayerId: PlayerId;
  phase: GamePhase;
  turnCount: number;
  winnerId: PlayerId | null;
  sequenceId: number; // monotonic event counter
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
}

export interface StateDelta {
  playerId?: PlayerId;
  fromPosition?: number;
  toPosition?: number;
  outcome?: MoveOutcome;
  diceValue?: number;
  nextPlayerId?: PlayerId;
  winnerId?: PlayerId;
}
