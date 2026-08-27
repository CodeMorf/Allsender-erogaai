export interface CacheService {
  ensureConnected(): Promise<void>;
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  increment(key: string, ttlSeconds?: number): Promise<number>;
  lock(key: string, ttlSeconds?: number): Promise<boolean>;
  unlock(key: string): Promise<void>;
}
