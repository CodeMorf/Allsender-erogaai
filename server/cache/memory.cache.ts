import { CacheService } from './cache.interface.ts';

interface CacheEntry {
  value: any;
  expiresAt: number | null;
}

export class MemoryCacheService implements CacheService {
  private store: Map<string, CacheEntry> = new Map();
  private locks: Set<string> = new Set();

  async ensureConnected(): Promise<void> {
    return Promise.resolve();
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    this.store.set(key, { value, expiresAt });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    const val = await this.get(key);
    return val !== null;
  }

  async increment(key: string, ttlSeconds = 60): Promise<number> {
    const current = (await this.get<number>(key)) || 0;
    const next = current + 1;
    await this.set(key, next, ttlSeconds);
    return next;
  }

  async lock(key: string, ttlSeconds = 30): Promise<boolean> {
    if (this.locks.has(key)) return false;
    this.locks.add(key);
    setTimeout(() => this.locks.delete(key), ttlSeconds * 1000);
    return true;
  }

  async unlock(key: string): Promise<void> {
    this.locks.delete(key);
  }
}
