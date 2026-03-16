import { v4 as uuidv4 } from 'uuid';
import { redis } from '../../shared/redis.js';
import logger from '../../shared/logger.js';

class MatchmakingService {
  constructor() {
    this.QUEUE_KEY_PREFIX = 'matchmaking:queue:';
  }

  async joinQueue(player) {
    const queueKey = `${this.QUEUE_KEY_PREFIX}${player.gameType}:${player.mode}`;
    
    // 1. Remove if already in any queue
    await this.leaveQueue(player.playerId);
    
    // 2. Add to Redis Sorted Set (Score = Timestamp)
    const ticketId = uuidv4();
    const ticketData = {
      ...player,
      ticketId,
      behaviorScore: player.behaviorScore || 100,
      ping: player.ping || 50,
      joinedAt: Date.now()
    };
    
    await redis.set(`matchmaking:ticket:${player.playerId}`, JSON.stringify(ticketData), { EX: 3600 });
    await redis.zAdd(queueKey, { score: Date.now(), value: player.playerId });
    
    logger.info(`[MATCHMAKING] Player ${player.playerId} joined ${player.gameType} queue`);
    
    // 3. Try to find a match
    return await this.findMatch(player);
  }

  async leaveQueue(playerId) {
    const ticketStr = await redis.get(`matchmaking:ticket:${playerId}`);
    if (ticketStr) {
      const ticket = JSON.parse(ticketStr);
      const queueKey = `${this.QUEUE_KEY_PREFIX}${ticket.gameType}:${ticket.mode}`;
      await redis.zRem(queueKey, playerId);
      await redis.del(`matchmaking:ticket:${playerId}`);
    }
  }

  async getQueueStatus(playerId, gameType, mode) {
    const queueKey = `${this.QUEUE_KEY_PREFIX}${gameType}:${mode}`;
    const rank = await redis.zRank(queueKey, playerId);
    const total = await redis.zCard(queueKey);
    
    return {
      inQueue: rank !== null,
      position: rank !== null ? rank + 1 : 0,
      totalInQueue: total
    };
  }

  async findMatch(player) {
    const queueKey = `${this.QUEUE_KEY_PREFIX}${player.gameType}:${player.mode}`;
    const waitTime = Date.now() - player.joinedAt;
    
    // Get all players in this queue
    const otherPlayerIds = await redis.zRange(queueKey, 0, -1);
    
    for (const oppId of otherPlayerIds) {
        if (oppId === player.playerId) continue;
        
        const oppStr = await redis.get(`matchmaking:ticket:${oppId}`);
        if (!oppStr) continue;
        const opponent = JSON.parse(oppStr);

        // 1. Behavior Score Check
        const isToxic1 = (player.behaviorScore || 100) < 30;
        const isToxic2 = (opponent.behaviorScore || 100) < 30;
        if (isToxic1 !== isToxic2) continue;

        // 2. Latency/Ping Check
        const pingTolerance = waitTime > 10000 ? 200 : 50;
        if (Math.abs(player.ping - opponent.ping) > pingTolerance) continue;

        // 3. ELO Check (Expanding range)
        const eloRange = 100 + (waitTime / 1000 * 20);
        if (Math.abs(player.elo - opponent.elo) <= eloRange) {
            // MATCH FOUND!
            await this.leaveQueue(player.playerId);
            await this.leaveQueue(opponent.playerId);
            
            return {
                id: uuidv4(),
                players: [player, opponent],
                gameType: player.gameType,
                mode: player.mode,
                createdAt: new Date().toISOString()
            };
        }
    }

    return null;
  }
}

const matchmakingService = new MatchmakingService();
export { matchmakingService };

