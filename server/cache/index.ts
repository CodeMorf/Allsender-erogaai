import { CacheService } from './cache.interface.ts';
import { MemoryCacheService } from './memory.cache.ts';
import { RedisCacheService } from './redis.cache.ts';

const driver = process.env.CACHE_DRIVER || 'memory';
const isProd = process.env.NODE_ENV === 'production';
const redisRequired = process.env.REDIS_REQUIRED === 'true';

export let cache: CacheService;

if (driver === 'redis' || isProd) {
  cache = new RedisCacheService(process.env.REDIS_URL);
} else {
  if (isProd && redisRequired) {
    throw new Error('CRITICAL: REDIS_REQUIRED=true in production but CACHE_DRIVER is memory');
  }
  cache = new MemoryCacheService();
}
