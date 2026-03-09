import { BreakoutEventMap, roomEventBus } from './EventBus';
import { toast } from 'sonner';
import { BreakoutService } from '@/services/BreakoutService';

/**
 * AutomationEngine (Rule Engine V1)
 * ─────────────────────────────────────────────────────────────
 * Phase 5 Upgrade: "Neural Actor"
 * Listens to structural events and applies real-time business
 * logic (rules) and active mutations (interventions).
 */
class AutomationEngine {
  private isInitialized = false;
  private autoCloseTimers: Map<string, NodeJS.Timeout> = new Map();

  init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // React to people moving around
    roomEventBus.on('USER_JOIN', this.evaluateJoinRules);
    roomEventBus.on('USER_LEAVE', this.evaluateLeaveRules);

    console.warn('[AutomationEngine] Initialized Phase 5 Actor Engine');
  }

  destroy() {
    roomEventBus.off('USER_JOIN', this.evaluateJoinRules);
    roomEventBus.off('USER_LEAVE', this.evaluateLeaveRules);

    // Clear all pending timers
    this.autoCloseTimers.forEach((timer) => clearTimeout(timer));
    this.autoCloseTimers.clear();

    this.isInitialized = false;
  }

  // ── Evaluators ────────────────────────────────────────────

  private evaluateJoinRules = async (payload: BreakoutEventMap['USER_JOIN']) => {
    // If someone joins, clear the auto-close timer for this room
    if (this.autoCloseTimers.has(payload.breakoutId)) {
      clearTimeout(this.autoCloseTimers.get(payload.breakoutId)!);
      this.autoCloseTimers.delete(payload.breakoutId);
      console.warn(
        `[AutomationEngine] Cancelled auto-close for Room ${payload.breakoutId.slice(0, 6)} (User joined)`
      );
    }

    if (payload.membersCount && payload.membersCount >= 15) {
      const title = 'Room capacity nearing limit';
      const description = `Room ${payload.breakoutId.slice(0, 6)} has ${payload.membersCount} participants. Consider splitting.`;
      toast.warning(title, { description });

      roomEventBus.emit('SYSTEM_ALERT', {
        level: 'warning',
        title,
        description,
        breakoutId: payload.breakoutId,
        timestamp: Date.now(),
      });
    }
  };

  private evaluateLeaveRules = async (payload: BreakoutEventMap['USER_LEAVE']) => {
    const { breakoutId, userId, membersCount } = payload;

    // Rule 1: Auto-Pause on Host Disconnect (ULTRA_SECURE fallback)
    // We fetch details to see if the user who left was the host
    try {
      const details = await BreakoutService.getBreakoutDetails(breakoutId);
      if (details && details.host_id === userId && details.status === 'LIVE') {
        // In a real scenario, check if the room's security level is high enough
        console.warn(
          `[AutomationEngine] Host ${userId} left LIVE room ${breakoutId}. Auto-pausing...`
        );

        await BreakoutService.pauseBreakout(breakoutId);

        roomEventBus.emit('AUTOMATION_EXECUTED', {
          action: 'Room Paused',
          targetId: breakoutId,
          description: `Automatically paused Room ${breakoutId.slice(0, 6)} because the host disconnected.`,
          timestamp: Date.now(),
        });
      }
    } catch (err) {
      console.error('[AutomationEngine] Error checking host status:', err);
    }

    // Rule 2: Garbage Collection (Auto-Close Empty Rooms)
    if (membersCount === 0) {
      console.warn(
        `[AutomationEngine] Room ${breakoutId.slice(0, 6)} is empty. Starting 30s auto-close timer.`
      );

      const timer = setTimeout(async () => {
        try {
          // Re-verify it's still empty if possible or just execute
          await BreakoutService.closeBreakout(breakoutId);
          this.autoCloseTimers.delete(breakoutId);

          roomEventBus.emit('AUTOMATION_EXECUTED', {
            action: 'Room Closed',
            targetId: breakoutId,
            description: `Automatically closed Room ${breakoutId.slice(0, 6)} after being empty for 30s.`,
            timestamp: Date.now(),
          });
        } catch (err) {
          console.error(`[AutomationEngine] Failed to auto-close room ${breakoutId}:`, err);
        }
      }, 30000); // 30 second grace period

      this.autoCloseTimers.set(breakoutId, timer);

      roomEventBus.emit('SYSTEM_ALERT', {
        level: 'info',
        title: 'Empty Room Garbage Collection',
        description: `Room ${breakoutId.slice(0, 6)} is empty. It will be closed automatically in 30s.`,
        breakoutId: breakoutId,
        timestamp: Date.now(),
      });
    }
  };
}

export const automationEngine = new AutomationEngine();
