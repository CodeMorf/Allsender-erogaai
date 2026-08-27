import { createRequire } from 'module';
import { CacheService } from './cache.interface.ts';
import { MemoryCacheService } from './memory.cache.ts';

const _require = createRequire(import.meta.url);

export class RedisCacheService implements CacheService {
  private redis: any = null;
  private fallbackMemory: MemoryCacheService;

  constructor(redisUrl?: string) {
    this.fallbackMemory = new MemoryCacheService();
    try {
      // ESM-safe require via createRequire — avoids crash if ioredis is absent
      const Redis = _require('ioredis');
      this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379', {
        maxRetriesPerRequest: 1,
        lazyConnect: true
      });
      this.redis.connect().catch((err: any) => {
        console.warn('[Cache] Redis connection failed. Falling back to MemoryCache:', err.message);
        this.redis = null;
      });
    } catch {
      this.redis = null;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.redis) return this.fallbackMemory.get<T>(key);
    try {
      const val = await this.redis.get(key);
      return val ? JSON.parse(val) : null;
    } catch {
      return this.fallbackMemory.get<T>(key);
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    if (!this.redis) return this.fallbackMemory.set<T>(key, value, ttlSeconds);
    try {
      const str = JSON.stringify(value);
      if (ttlSeconds) {
        await this.redis.setex(key, ttlSeconds, str);
      } else {
        await this.redis.set(key, str);
      }
    } catch {
      await this.fallbackMemory.set<T>(key, value, ttlSeconds);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.redis) return this.fallbackMemory.del(key);
    try {
      await this.redis.del(key);
    } catch {
      await this.fallbackMemory.del(key);
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.redis) return this.fallbackMemory.exists(key);
    try {
      const res = await this.redis.exists(key);
      return res === 1;
    } catch {
      return this.fallbackMemory.exists(key);
    }
  }

  async increment(key: string, ttlSeconds = 60): Promise<number> {
    if (!this.redis) return this.fallbackMemory.increment(key, ttlSeconds);
    try {
      const val = await this.redis.incr(key);
      if (val === 1 && ttlSeconds) {
        await this.redis.expire(key, ttlSeconds);
      }
      return val;
    } catch {
      return this.fallbackMemory.increment(key, ttlSeconds);
    }
  }

  async lock(key: string, ttlSeconds = 30): Promise<boolean> {
    if (!this.redis) return this.fallbackMemory.lock(key, ttlSeconds);
    try {
      const res = await this.redis.set(`lock:${key}`, 'locked', 'EX', ttlSeconds, 'NX');
      return res === 'OK';
    } catch {
      return this.fallbackMemory.lock(key, ttlSeconds);
    }
  }

  async unlock(key: string): Promise<void> {
    if (!this.redis) return this.fallbackMemory.unlock(key);
    try {
      await this.redis.del(`lock:${key}`);
    } catch {
      await this.fallbackMemory.unlock(key);
    }
  }
}
