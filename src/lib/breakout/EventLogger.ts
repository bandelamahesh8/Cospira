import { supabase } from '@/integrations/supabase/client';
import { BreakoutEventMap, roomEventBus } from './EventBus';

interface BufferedEvent {
  event_type: string;
  breakout_id: string;
  payload: unknown;
  created_at: string;
}

/**
 * EventLogger
 * ─────────────────────────────────────────────────────────────
 * Listens to the `roomEventBus` and persists structural history
 * to the database in batches for scalability.
 */
class EventLogger {
  private isInitialized = false;
  private eventBuffer: BufferedEvent[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 50;
  private readonly FLUSH_INTERVAL_MS = 10000; // 10 seconds

  init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Type-safe listeners
    this.subscribe('ROOM_STATE_CHANGE');
    this.subscribe('USER_JOIN');
    this.subscribe('USER_LEAVE');
    this.subscribe('SYSTEM_ALERT');
    this.subscribe('CHAT_MESSAGE');
    this.subscribe('AUTOMATION_EXECUTED');

    // Start periodic flush
    this.flushInterval = setInterval(() => this.flushEvents(), this.FLUSH_INTERVAL_MS);

    console.warn(
      `[EventLogger] Initialized. Batching ${this.BATCH_SIZE} events every ${this.FLUSH_INTERVAL_MS / 1000}s`
    );
  }

  destroy() {
    this.flushEvents();

    if (this.flushInterval) clearInterval(this.flushInterval);

    this.unsubscribe('ROOM_STATE_CHANGE');
    this.unsubscribe('USER_JOIN');
    this.unsubscribe('USER_LEAVE');
    this.unsubscribe('SYSTEM_ALERT');
    this.unsubscribe('CHAT_MESSAGE');
    this.unsubscribe('AUTOMATION_EXECUTED');

    this.isInitialized = false;
  }

  private subscribe<K extends keyof BreakoutEventMap>(type: K) {
    roomEventBus.on(type, this.handleEvent(type));
  }

  private unsubscribe<K extends keyof BreakoutEventMap>(type: K) {
    roomEventBus.off(type, this.handleEvent(type));
  }

  // ── Event Handler Factory ──────────────────────────────────

  private handleEvent =
    <K extends keyof BreakoutEventMap>(type: K) =>
    async (payload: BreakoutEventMap[K]) => {
      // Extract breakoutId accurately from varying payload shapes
      let breakoutId: string | undefined;

      if (typeof payload === 'object' && payload !== null) {
        const p = payload as unknown as Record<string, unknown>;
        breakoutId = (p.breakoutId as string) || (p.targetId as string);
      }

      // Strict UUID validation for Supabase persistence
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        breakoutId || ''
      );

      if (!breakoutId || breakoutId === 'all' || !isUUID) {
        return;
      }

      this.eventBuffer.push({
        event_type: type,
        breakout_id: breakoutId,
        payload: payload,
        created_at: new Date().toISOString(),
      });

      if (this.eventBuffer.length >= this.BATCH_SIZE) {
        this.flushEvents();
      }
    };

  // ── Persistence Layer ─────────────────────────────────────

  private async flushEvents() {
    if (this.eventBuffer.length === 0) return;

    const batch = [...this.eventBuffer];
    this.eventBuffer = [];

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('room_event_logs').insert(batch);

      if (error) {
        console.error('[EventLogger] Batch insert failed:', error.message);
      }
    } catch (e) {
      console.error('[EventLogger] Exception during flush:', e);
    }
  }
}

export const eventLogger = new EventLogger();
