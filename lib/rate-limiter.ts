// lib/rate-limiter.ts
import { Redis } from "@upstash/redis";

// ─── In-Memory Rate Limiter (for development) ─────────────────────────────

class InMemoryRateLimiter {
  private store = new Map<string, { count: number; resetAt: number }>();

  async check(
    key: string,
    options: { maxRequests: number; windowMs: number },
  ): Promise<{ success: boolean; retryAfter?: number }> {
    const now = Date.now();
    const record = this.store.get(key);

    if (!record || record.resetAt < now) {
      this.store.set(key, {
        count: 1,
        resetAt: now + options.windowMs,
      });
      return { success: true };
    }

    if (record.count >= options.maxRequests) {
      const retryAfter = Math.ceil((record.resetAt - now) / 1000);
      return { success: false, retryAfter };
    }

    record.count++;
    this.store.set(key, record);
    return { success: true };
  }
}

// ─── Redis Rate Limiter (for production) ──────────────────────────────────

class RedisRateLimiter {
  private redis: Redis;

  constructor() {
    this.redis = Redis.fromEnv();
  }

  async check(
    key: string,
    options: { maxRequests: number; windowMs: number },
  ): Promise<{ success: boolean; retryAfter?: number }> {
    const now = Date.now();
    const windowKey = `ratelimit:${key}`;

    const current = await this.redis.get<number>(windowKey);

    if (!current) {
      await this.redis.set(windowKey, 1, {
        ex: Math.ceil(options.windowMs / 1000),
      });
      return { success: true };
    }

    if (current >= options.maxRequests) {
      const ttl = await this.redis.ttl(windowKey);
      return { success: false, retryAfter: ttl || 60 };
    }

    await this.redis.incr(windowKey);
    return { success: true };
  }
}

// ─── Export ──────────────────────────────────────────────────────────────────

// Use Redis in production, fallback to in-memory
const useRedis = !!process.env.UPSTASH_REDIS_REST_URL;

export const RateLimiter = useRedis
  ? new RedisRateLimiter()
  : new InMemoryRateLimiter();
