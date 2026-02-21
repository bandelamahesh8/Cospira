import { v4 as uuidv4 } from 'uuid';

class MatchmakingService {
  constructor() {
    this.queue = []; // Array of { playerId, gameType, mode, elo, behaviorScore, ping, socketId, joinedAt }
  }

  joinQueue(player) {
    // Remove if already in queue
    this.leaveQueue(player.playerId);
    
    // Add to queue
    this.queue.push({
      ...player,
      ticketId: uuidv4(),
      behaviorScore: player.behaviorScore || 100, // Default to 100 if missing
      ping: player.ping || 50, // Default to 50ms if missing
    });
    
    // Try to find a match immediately
    return this.findMatch(player);
  }

  leaveQueue(playerId) {
    this.queue = this.queue.filter(p => p.playerId !== playerId);
  }

  getQueueStatus(playerId, gameType, mode) {
    const position = this.queue.findIndex(p => p.playerId === playerId && p.gameType === gameType);
    const totalInQueue = this.queue.filter(p => p.gameType === gameType && p.mode === mode).length;
    
    return {
      inQueue: position !== -1,
      position: position !== -1 ? position + 1 : 0,
      totalInQueue
    };
  }

  findMatch(player) {
    // Filter potential opponents
    const candidates = this.queue.filter(opponent => 
      opponent.playerId !== player.playerId &&
      opponent.gameType === player.gameType &&
      opponent.mode === player.mode
    );

    // 1. Behavior Score Check (Shadow Queue)
    // If you are toxic (<30), you only play with toxic players.
    // If you are clean (>=30), you only play with clean players.
    const myScore = player.behaviorScore || 100;
    const isToxic = myScore < 30;

    const behaviorFiltered = candidates.filter(opp => {
        const oppScore = opp.behaviorScore || 100;
        const oppIsToxic = oppScore < 30;
        return isToxic === oppIsToxic;
    });

    if (behaviorFiltered.length === 0) return null;

    // 2. Latency Check (Ping)
    // Prefer players within 50ms diff.
    // If waiting > 10s, relax this.
    const waitTime = Date.now() - player.joinedAt;
    const pingTolerance = waitTime > 10000 ? 200 : 50; 
    
    const pingFiltered = behaviorFiltered.filter(opp => {
        const diff = Math.abs((player.ping || 0) - (opp.ping || 0));
        return diff <= pingTolerance;
    });

    // If stricter check fails and we have been waiting, maybe verify if we can fallback?
    // For now, let's just proceed with best candidates. 
    // If pingFiltered is empty but we have candidates, and we waited long enough, take anyone? 
    // Let's stick to the list we have. If empty, return null (wait for more players).
    let potentialMatches = pingFiltered.length > 0 ? pingFiltered : (waitTime > 15000 ? behaviorFiltered : []);

    if (potentialMatches.length === 0) return null;

    // 3. ELO Check
    // Standard +/- 100, expanding by 100 every 5 seconds.
    const timeInSeconds = waitTime / 1000;
    const eloRange = 100 + (timeInSeconds * 20); // Expand range over time

    const match = potentialMatches.find(opp => {
      const diff = Math.abs(player.elo - opp.elo);
      return diff <= eloRange;
    });

    if (match) {
      // Remove both from queue
      this.leaveQueue(player.playerId);
      this.leaveQueue(match.playerId);
      
      return {
        id: uuidv4(),
        players: [player, match],
        gameType: player.gameType,
        mode: player.mode,
        createdAt: new Date().toISOString()
      };
    }

    return null;
  }
}

// Singleton
const matchmakingService = new MatchmakingService();
export { matchmakingService };

