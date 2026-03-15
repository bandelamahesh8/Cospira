 
export type GameErrorCode =
  | 'NOT_YOUR_TURN'
  | 'INVALID_DICE'
  | 'INVALID_STATE_TRANSITION'
  | 'BOARD_CONFIG_INVALID'
  | 'PLAYER_NOT_FOUND'
  | 'ROOM_NOT_FOUND'
  | 'HOST_ONLY_ACTION'
  | 'GAME_ALREADY_COMPLETE'
  | 'SEQUENCE_GAP_DETECTED'
  | 'HMAC_VERIFICATION_FAILED'
  | 'DESERIALIZATION_FAILED'
  | 'TURN_TIMER_EXPIRED'
  | 'MAX_PLAYERS_REACHED'
  | 'SPECTATOR_CANNOT_ACT'
  | 'GAME_NOT_ACTIVE'
  | 'INSUFFICIENT_PLAYERS';

export interface IGameError {
  code: GameErrorCode;
  message: string;
  retryable: boolean;
  context?: Record<string, unknown>;
  traceId?: string;
}

export class GameError extends Error implements IGameError {
  public code: GameErrorCode;
  public retryable: boolean;
  public context?: Record<string, unknown>;
  public traceId?: string;

  constructor(
    code: GameErrorCode,
    message: string,
    retryable: boolean = false,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.code = code;
    this.retryable = retryable;
    this.context = context;
    this.traceId = this.generateTraceId();
  }

  private generateTraceId(): string {
    return `game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
