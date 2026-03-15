/* eslint-disable @typescript-eslint/no-unused-vars */
// Assuming prom-client is available
import { register, Counter, Histogram } from 'prom-client';

export class GameMetrics {
  private static eventsTotal = new Counter({
    name: 'game_events_total',
    help: 'Total game events',
    labelNames: ['action', 'room_id'],
  });

  private static errorsTotal = new Counter({
    name: 'game_errors_total',
    help: 'Total game errors',
    labelNames: ['code'],
  });

  private static hostMigrationsTotal = new Counter({
    name: 'host_migrations_total',
    help: 'Total host migrations',
  });

  private static turnTimersExpiredTotal = new Counter({
    name: 'turn_timers_expired_total',
    help: 'Total turn timer expiries',
  });

  private static stateSyncsTotal = new Counter({
    name: 'state_syncs_total',
    help: 'Total state syncs',
  });

  private static moveLatency = new Histogram({
    name: 'game_move_latency_ms',
    help: 'Move latency in ms',
    labelNames: ['outcome'],
    buckets: [1, 5, 10, 25, 50, 100, 250],
  });

  private static gameDuration = new Histogram({
    name: 'game_duration_seconds',
    help: 'Game duration in seconds',
    buckets: [60, 120, 300, 600, 1200],
  });

  private static payloadBytes = new Histogram({
    name: 'websocket_payload_bytes',
    help: 'WebSocket payload size in bytes',
    buckets: [256, 512, 1024, 2048],
  });

  static recordEvent(action: string, roomId: string): void {
    this.eventsTotal.inc({ action, room_id: roomId });
  }

  static recordError(code: string): void {
    this.errorsTotal.inc({ code });
  }

  static recordHostMigration(): void {
    this.hostMigrationsTotal.inc();
  }

  static recordStateSync(): void {
    this.stateSyncsTotal.inc();
  }

  static recordMoveLatency(outcome: string, latency: number): void {
    this.moveLatency.observe({ outcome }, latency);
  }

  static recordPayloadSize(size: number): void {
    this.payloadBytes.observe(size);
  }
}
