/**
 * Layer 1: Core Infrastructure
 * State Management Layer (Redis Abstraction)
 */

export interface StorageDriver {
    get(key: string): Promise<any>;
    set(key: string, value: any, ttlSeconds?: number): Promise<void>;
    del(key: string): Promise<void>;
    incr(key: string): Promise<number>;
}

class MemoryDriver implements StorageDriver {
    private store = new Map<string, { val: any, exp: number }>();

    async get(key: string) {
        const item = this.store.get(key);
        if (!item) return null;
        if (item.exp > 0 && Date.now() > item.exp) {
            this.store.delete(key);
            return null;
        }
        return item.val;
    }

    async set(key: string, value: any, ttlSeconds: number = 0) {
        const exp = ttlSeconds > 0 ? Date.now() + (ttlSeconds * 1000) : 0;
        this.store.set(key, { val: value, exp });
    }

    async del(key: string) {
        this.store.delete(key);
    }

    async incr(key: string) {
        const val = await this.get(key) || 0;
        const newVal = Number(val) + 1;
        this.set(key, newVal);
        return newVal;
    }
}

// Placeholder for future Redis implementation
class RedisDriver implements StorageDriver {
    // client: RedisClient;
    async get(key: string) { return null; }
    async set(key: string, value: any, ttl?: number) { }
    async del(key: string) { }
    async incr(key: string) { return 0; }
}

export class StateLayer {
    // Configurable Driver (Default to Memory for dev)
    private static driver: StorageDriver = new MemoryDriver();

    static useRedis() {
        console.log("🔌 [INFRA] Switching to Redis Driver...");
        this.driver = new RedisDriver();
    }

    static async getGame(gameId: string) {
        return this.driver.get(`game:${gameId}`);
    }

    static async saveGame(gameId: string, state: any) {
        return this.driver.set(`game:${gameId}`, state, 3600); // 1 hour TTL
    }

    static async cacheUser(userId: string, profile: any) {
        return this.driver.set(`user:${userId}`, profile, 300); // 5 min TTL
    }
}
