/**
 * Layer 1: Core Infrastructure
 * State Management Layer (Redis Abstraction)
 */

export interface StorageDriver {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  incr(key: string): Promise<number>;
}

class MemoryDriver implements StorageDriver {
  private store = new Map<string, { val: unknown; exp: number }>();

  async get(key: string) {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.exp > 0 && Date.now() > item.exp) {
      this.store.delete(key);
      return null;
    }
    return item.val;
  }

  async set(key: string, value: unknown, ttlSeconds: number = 0) {
    const exp = ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : 0;
    this.store.set(key, { val: value, exp });
  }

  async del(key: string) {
    this.store.delete(key);
  }

  async incr(key: string) {
    const val = ((await this.get(key)) || 0) as number;
    const newVal = Number(val) + 1;
    await this.set(key, newVal);
    return newVal;
  }
}

// Placeholder for future Redis implementation
class RedisDriver implements StorageDriver {
  // client: RedisClient;
  async get(_key: string) {
    return null;
  }
  async set(_key: string, _value: unknown, _ttl?: number) {}
  async del(_key: string) {}
  async incr(_key: string) {
    return 0;
  }
}

export class StateLayer {
  // Configurable Driver (Default to Memory for dev)
  private static driver: StorageDriver = new MemoryDriver();

  static useRedis() {
    console.warn('🔌 [INFRA] Switching to Redis Driver...');
    this.driver = new RedisDriver();
  }

  static async getGame(gameId: string) {
    return this.driver.get(`game:${gameId}`);
  }

  static async saveGame(gameId: string, state: unknown) {
    return this.driver.set(`game:${gameId}`, state, 3600); // 1 hour TTL
  }

  static async cacheUser(userId: string, profile: unknown) {
    return this.driver.set(`user:${userId}`, profile, 300); // 5 min TTL
  }
}
