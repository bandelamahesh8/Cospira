// Assuming Redis client is available
import { createClient } from 'redis';

interface RoomRegistryEntry {
  roomId: string;
  hostId: string;
  hostSocketId: string;
  playerIds: string[];
  phase: string;
  sequenceId: number;
  stateSnapshot: string;
  lastUpdatedAt: number;
  ttl: number;
}

export class RedisRoomRegistry {
  private client = createClient();

  async registerRoom(entry: RoomRegistryEntry): Promise<void> {
    await this.client.hSet(`room:${entry.roomId}`, {
      hostId: entry.hostId,
      hostSocketId: entry.hostSocketId,
      playerIds: JSON.stringify(entry.playerIds),
      phase: entry.phase,
      sequenceId: entry.sequenceId.toString(),
      stateSnapshot: entry.stateSnapshot,
      lastUpdatedAt: entry.lastUpdatedAt.toString(),
    });
    await this.client.expire(`room:${entry.roomId}`, entry.ttl);
  }

  async getRoom(roomId: string): Promise<RoomRegistryEntry | null> {
    const data = await this.client.hGetAll(`room:${roomId}`);
    if (!data.hostId) return null;
    return {
      roomId,
      hostId: data.hostId,
      hostSocketId: data.hostSocketId,
      playerIds: JSON.parse(data.playerIds),
      phase: data.phase,
      sequenceId: parseInt(data.sequenceId),
      stateSnapshot: data.stateSnapshot,
      lastUpdatedAt: parseInt(data.lastUpdatedAt),
      ttl: 600, // default
    };
  }

  async updateHost(roomId: string, newHostId: string, newHostSocketId: string): Promise<void> {
    await this.client.hSet(`room:${roomId}`, {
      hostId: newHostId,
      hostSocketId: newHostSocketId,
    });
  }
}
