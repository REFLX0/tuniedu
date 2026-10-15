// =============================================================================
// TuniEdu Redis Client (Layer 8: Caching & Asynchronous Work)
// ioredis client with connection pooling, reconnect retry strategy, and in-memory fallback
// =============================================================================

import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

class MemoryCacheFallback {
  private store = new Map<string, { value: string; expiresAt: number | null }>();

  async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: string, mode?: string, duration?: number): Promise<'OK'> {
    let expiresAt: number | null = null;
    if (mode === 'EX' && duration) {
      expiresAt = Date.now() + duration * 1000;
    } else if (mode === 'PX' && duration) {
      expiresAt = Date.now() + duration;
    }
    this.store.set(key, { value, expiresAt });
    return 'OK';
  }

  async del(key: string): Promise<number> {
    return this.store.delete(key) ? 1 : 0;
  }

  async incr(key: string): Promise<number> {
    const current = await this.get(key);
    const num = current ? parseInt(current, 10) + 1 : 1;
    this.store.set(key, { value: num.toString(), expiresAt: null });
    return num;
  }

  async expire(key: string, seconds: number): Promise<number> {
    const item = this.store.get(key);
    if (!item) return 0;
    item.expiresAt = Date.now() + seconds * 1000;
    return 1;
  }
}

const memoryFallback = new MemoryCacheFallback();

let redisClient: Redis | null = null;
let isRedisConnected = false;

try {
  redisClient = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 1,
    retryStrategy(times: number) {
      if (times > 3) {
        return null; // Stop retrying and stay on memory fallback
      }
      return Math.min(times * 100, 2000);
    },
    enableOfflineQueue: false,
    lazyConnect: true,
  });

  redisClient.on('connect', () => {
    isRedisConnected = true;
  });

  redisClient.on('error', () => {
    isRedisConnected = false;
  });
} catch {
  isRedisConnected = false;
}

export const cache = {
  async get(key: string): Promise<string | null> {
    if (isRedisConnected && redisClient) {
      try {
        return await redisClient.get(key);
      } catch {
        // Fallback on error
      }
    }
    return memoryFallback.get(key);
  },

  async set(key: string, value: string, ttlSeconds?: number): Promise<'OK'> {
    if (isRedisConnected && redisClient) {
      try {
        if (ttlSeconds) {
          return await redisClient.set(key, value, 'EX', ttlSeconds);
        }
        return await redisClient.set(key, value);
      } catch {
        // Fallback on error
      }
    }
    return memoryFallback.set(key, value, ttlSeconds ? 'EX' : undefined, ttlSeconds);
  },

  async del(key: string): Promise<number> {
    if (isRedisConnected && redisClient) {
      try {
        return await redisClient.del(key);
      } catch {
        // Fallback on error
      }
    }
    return memoryFallback.del(key);
  },

  async incr(key: string): Promise<number> {
    if (isRedisConnected && redisClient) {
      try {
        return await redisClient.incr(key);
      } catch {
        // Fallback on error
      }
    }
    return memoryFallback.incr(key);
  },

  async expire(key: string, seconds: number): Promise<number> {
    if (isRedisConnected && redisClient) {
      try {
        return await redisClient.expire(key, seconds);
      } catch {
        // Fallback on error
      }
    }
    return memoryFallback.expire(key, seconds);
  },
};

export { redisClient };
