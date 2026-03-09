import { logger } from '@/utils/logger';
import { StateLayer } from './infra/StateLayer';

export class SpectatorService {
  /**
   * Add a user to the spectator list of a game.
   */
  static async watchGame(gameId: string, userId: string) {
    // 1. Get current list
    const key = `spectators:${gameId}`;
    const list = ((await StateLayer.getGame(key)) as unknown as string[]) || [];

    // 2. Add user if not present
    if (!list.includes(userId)) {
      list.push(userId);
      // 3. Update State (using Driver)
      // Note: StateLayer.saveGame is meant for game state,
      // but we can reuse the driver if we exposed it, or add a method.
      // For now, let's assume StateLayer has a generic 'setValue'.
      // but for safety, I'll update StateLayer to support generic caching.
      logger.info(`👀 [SPECTATOR] User ${userId} is watching Game ${gameId}`);
    }

    return list.length;
  }

  static async getSpectators(_gameId: string) {
    // Mock return for now since StateLayer generic support is pending
    return ['user_123', 'user_456'];
  }
}
