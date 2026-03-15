import { GameAction, PlayerId } from '../types';
import { GameErrorCode } from '../errors/GameError';

export interface GameLogEntry {
  timestamp: number;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  service: 'snake-ladder-engine';
  roomId: string;
  playerId?: PlayerId;
  action?: GameAction;
  sequenceId?: number;
  durationMs?: number;
  errorCode?: GameErrorCode;
  traceId: string;
  spanId: string;
  message: string;
  context?: Record<string, unknown>;
}

export class GameLogger {
  private static log(entry: GameLogEntry): void {
    console.log(JSON.stringify(entry));
  }

  static debug(roomId: string, message: string, context?: Record<string, unknown>): void {
    this.log({
      timestamp: Date.now(),
      level: 'DEBUG',
      service: 'snake-ladder-engine',
      roomId,
      traceId: 'trace-id', // from context
      spanId: 'span-id',
      message,
      context,
    });
  }

  static info(roomId: string, message: string, context?: Record<string, unknown>): void {
    this.log({
      timestamp: Date.now(),
      level: 'INFO',
      service: 'snake-ladder-engine',
      roomId,
      traceId: 'trace-id',
      spanId: 'span-id',
      message,
      context,
    });
  }

  static warn(roomId: string, message: string, context?: Record<string, unknown>): void {
    this.log({
      timestamp: Date.now(),
      level: 'WARN',
      service: 'snake-ladder-engine',
      roomId,
      traceId: 'trace-id',
      spanId: 'span-id',
      message,
      context,
    });
  }

  static error(
    roomId: string,
    message: string,
    errorCode?: GameErrorCode,
    context?: Record<string, unknown>
  ): void {
    this.log({
      timestamp: Date.now(),
      level: 'ERROR',
      service: 'snake-ladder-engine',
      roomId,
      traceId: 'trace-id',
      spanId: 'span-id',
      message,
      errorCode,
      context,
    });
  }
}
