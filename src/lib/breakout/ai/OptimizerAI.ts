import { roomEventBus, UserJoinPayload } from '../EventBus';

/**
 * OptimizerAI
 * Monitors capacity and engagement to suggest room changes.
 */
export class OptimizerAI {
  private static instance: OptimizerAI;

  private constructor() {}

  public static getInstance(): OptimizerAI {
    if (!OptimizerAI.instance) OptimizerAI.instance = new OptimizerAI();
    return OptimizerAI.instance;
  }

  public handleJoin(payload: UserJoinPayload) {
    const { breakoutId, membersCount } = payload;
    if (!membersCount) return;

    // Capacity Monitoring
    if (membersCount >= 18) {
      // Assuming 20 is standard max
      roomEventBus.emit('ROOM_SUGGESTION', {
        breakoutId,
        type: 'CAPACITY',
        suggestion: 'Room nearing capacity. Recommend auto-creating overflow breakout.',
        severity: 'warning',
        timestamp: Date.now(),
      });
    }
  }

  // Placeholder for engagement monitoring (requires more complex activity tracking)
  public analyzeEngagement(breakoutId: string, activityScore: number) {
    if (activityScore < 0.2) {
      roomEventBus.emit('ROOM_SUGGESTION', {
        breakoutId,
        type: 'ENGAGEMENT',
        suggestion: 'Low engagement detected. Consider merging with another room.',
        severity: 'info',
        timestamp: Date.now(),
      });
    }
  }
}
