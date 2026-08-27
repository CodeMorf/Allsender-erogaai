import { createRequire } from 'module';
import { CacheService } from './cache.interface.ts';
import { MemoryCacheService } from './memory.cache.ts';

export class RedisCacheService implements CacheService {
  private redis: any = null;
  private fallbackMemory: MemoryCacheService;
  private connectPromise: Promise<void> | null = null;

  constructor(redisUrl?: string) {
    this.fallbackMemory = new MemoryCacheService();
    const isRequired = process.env.REDIS_REQUIRED === 'true';

    try {
      let RedisModule: any = null;
      try {
        const _require = typeof require !== 'undefined' ? require : createRequire(import.meta.url);
        RedisModule = _require('ioredis');
      } catch {
        RedisModule = null;
      }

      if (RedisModule) {
        const Redis = RedisModule.default || RedisModule;
        this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379', {
          maxRetriesPerRequest: 1,
          lazyConnect: true
        });
        this.connectPromise = this.redis.connect().then(() => undefined).catch((err: any) => {
          if (!isRequired) {
            console.warn('[Cache] Redis connection failed. Falling back to MemoryCache:', err.message);
            this.redis = null;
          }
          throw new Error(`REDIS_CONNECTION_FAILED: ${err.message}`);
        });
      } else if (isRequired) {
        throw new Error('REDIS_REQUIRED=true but ioredis driver is not available');
      }
    } catch (err: any) {
      if (isRequired) {
        throw err;
      }
      this.redis = null;
    }
  }

  private async waitForConnection(): Promise<void> {
    if (!this.connectPromise) {
      if (process.env.REDIS_REQUIRED === 'true') throw new Error('REDIS_REQUIRED=true but Redis is not connected');
      return;
    }
    try {
      await this.connectPromise;
    } catch (error) {
      if (process.env.REDIS_REQUIRED === 'true') throw error;
      this.redis = null;
    }
  }

  async ensureConnected(): Promise<void> {
    await this.waitForConnection();
    if (!this.redis) {
      if (process.env.REDIS_REQUIRED === 'true') throw new Error('REDIS_REQUIRED=true but Redis is not connected');
      return;
    }
    try {
      await this.redis.ping();
    } catch (error: any) {
      if (process.env.REDIS_REQUIRED === 'true') throw new Error(`REDIS_CONNECTION_FAILED: ${error.message}`);
      this.redis = null;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    await this.waitForConnection();
    if (!this.redis) {
      if (process.env.REDIS_REQUIRED === 'true') throw new Error('REDIS_REQUIRED=true but Redis is not connected');
      return this.fallbackMemory.get<T>(key);
    }
    try {
      const val = await this.redis.get(key);
      return val ? JSON.parse(val) : null;
    } catch (err) {
      if (process.env.REDIS_REQUIRED === 'true') throw err;
      return this.fallbackMemory.get<T>(key);
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    await this.waitForConnection();
    if (!this.redis) {
      if (process.env.REDIS_REQUIRED === 'true') throw new Error('REDIS_REQUIRED=true but Redis is not connected');
      return this.fallbackMemory.set<T>(key, value, ttlSeconds);
    }
    try {
      const str = JSON.stringify(value);
      if (ttlSeconds) {
        await this.redis.setex(key, ttlSeconds, str);
      } else {
        await this.redis.set(key, str);
      }
    } catch (err) {
      if (process.env.REDIS_REQUIRED === 'true') throw err;
      await this.fallbackMemory.set<T>(key, value, ttlSeconds);
    }
  }

  async del(key: string): Promise<void> {
    await this.waitForConnection();
    if (!this.redis) {
      if (process.env.REDIS_REQUIRED === 'true') throw new Error('REDIS_REQUIRED=true but Redis is not connected');
      return this.fallbackMemory.del(key);
    }
    try {
      await this.redis.del(key);
    } catch (err) {
      if (process.env.REDIS_REQUIRED === 'true') throw err;
      await this.fallbackMemory.del(key);
    }
  }

  async exists(key: string): Promise<boolean> {
    await this.waitForConnection();
    if (!this.redis) {
      if (process.env.REDIS_REQUIRED === 'true') throw new Error('REDIS_REQUIRED=true but Redis is not connected');
      return this.fallbackMemory.exists(key);
    }
    try {
      const res = await this.redis.exists(key);
      return res === 1;
    } catch (err) {
      if (process.env.REDIS_REQUIRED === 'true') throw err;
      return this.fallbackMemory.exists(key);
    }
  }

  async increment(key: string, ttlSeconds = 60): Promise<number> {
    await this.waitForConnection();
    if (!this.redis) {
      if (process.env.REDIS_REQUIRED === 'true') throw new Error('REDIS_REQUIRED=true but Redis is not connected');
      return this.fallbackMemory.increment(key, ttlSeconds);
    }
    try {
      const val = await this.redis.incr(key);
      if (val === 1 && ttlSeconds) {
        await this.redis.expire(key, ttlSeconds);
      }
      return val;
    } catch (err) {
      if (process.env.REDIS_REQUIRED === 'true') throw err;
      return this.fallbackMemory.increment(key, ttlSeconds);
    }
  }

  async lock(key: string, ttlSeconds = 30): Promise<boolean> {
    await this.waitForConnection();
    if (!this.redis) {
      if (process.env.REDIS_REQUIRED === 'true') throw new Error('REDIS_REQUIRED=true but Redis is not connected');
      return this.fallbackMemory.lock(key, ttlSeconds);
    }
    try {
      const res = await this.redis.set(`lock:${key}`, 'locked', 'EX', ttlSeconds, 'NX');
      return res === 'OK';
    } catch (err) {
      if (process.env.REDIS_REQUIRED === 'true') throw err;
      return this.fallbackMemory.lock(key, ttlSeconds);
    }
  }

  async unlock(key: string): Promise<void> {
    await this.waitForConnection();
    if (!this.redis) {
      if (process.env.REDIS_REQUIRED === 'true') throw new Error('REDIS_REQUIRED=true but Redis is not connected');
      return this.fallbackMemory.unlock(key);
    }
    try {
      await this.redis.del(`lock:${key}`);
    } catch (err) {
      if (process.env.REDIS_REQUIRED === 'true') throw err;
      await this.fallbackMemory.unlock(key);
    }
  }
}
