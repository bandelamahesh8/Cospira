import { supabase as _supabase } from '@/integrations/supabase/client';
import { BrainOS } from '../brain-os/BrainOS';

export interface TelemetryEvent {
  type: 'GAME_MOVE' | 'PURCHASE' | 'UI_INTERACTION' | 'ERROR' | 'LOGIN' | 'SYSTEM';
  userId?: string;
  gameId?: string;
  payload: Record<string, unknown>;
  timestamp: number;
}

export class TelemetryService {
  private static buffer: TelemetryEvent[] = [];
  private static readonly BATCH_SIZE = 10;
  private static readonly FLUSH_INTERVAL = 5000; // 5 seconds

  static init() {
    if (typeof window !== 'undefined') return; // Server-side only usually, or robust client side handling

    // Auto-flush timer
    setInterval(() => this.flush(), this.FLUSH_INTERVAL);
  }

  /**
   * Ingest an event into the system.
   * This is the "Nerve Ending" of Cospira.
   */
  static async track(
    type: TelemetryEvent['type'],
    payload: Record<string, unknown>,
    userId?: string,
    gameId?: string
  ) {
    const event: TelemetryEvent = {
      type,
      payload,
      userId,
      gameId,
      timestamp: Date.now(),
    };

    // 1. Validations / Sanitization
    // ...

    // 2. Add to Buffer (for DB storage)
    this.buffer.push(event);
    if (this.buffer.length >= this.BATCH_SIZE) {
      await this.flush(); // Async flush
    }

    // 3. Real-time Pipe to BRAIN OS
    // The Brain needs to know IMMEDIATELY about some events
    this.pipeToBrain(event);
  }

  private static pipeToBrain(event: TelemetryEvent) {
    // Feed Optimization Engine
    if (event.type === 'GAME_MOVE') {
      // Anti-Cheat Scan
      if (event.userId) BrainOS.AntiCheat.scanPlayer(event.userId);
    }

    if (event.type === 'PURCHASE') {
      // Economy Update
      if (event.userId) BrainOS.Economy.analyzePlayerValue(event.userId);
    }
  }

  private static async flush() {
    if (this.buffer.length === 0) return;

    const batch = [...this.buffer];
    this.buffer = [];

    console.warn(`📡 [TELEMETRY] Flushing ${batch.length} events...`);

    // In a real microservice, this would push to Kafka/RabbitMQ.
    // Here we push to a Supabase Log Table (or just console for dev).

    /* 
        const { error } = await supabase.from('system_telemetry').insert(batch.map(e => ({
            event_type: e.type,
            user_id: e.userId,
            payload: e.payload,
            created_at: new Date(e.timestamp).toISOString()
        })));
        */
  }
}
