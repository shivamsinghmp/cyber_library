/**
 * Caching layer — Upstash Redis with graceful DB fallback.
 * The app NEVER crashes due to Redis failures; it silently fetches from DB.
 *
 * Usage:
 *   import { getOrCache, invalidateCache, CacheKey, CACHE_TTL } from "@/lib/cache";
 *
 *   const profile = await getOrCache(
 *     CacheKey.studentProfile(userId),
 *     CACHE_TTL.STUDENT_PROFILE,
 *     () => prisma.profile.findUnique({ where: { userId } }),
 *   );
 */

import { Redis } from "@upstash/redis";

let _redis: Redis | null = null;

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL) return null;
  if (!_redis) {
    _redis = new Redis({
      url:   process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN ?? "",
    });
  }
  return _redis;
}

// ── TTL constants (seconds) ─────────────────────────────────────────────────
export const CACHE_TTL = {
  STUDENT_PROFILE:  300,    // 5 min — profile data changes rarely
  COIN_BALANCE:      60,    // 1 min — balance changes on every transaction
  TEMPLATE_LIST:   3600,    // 1 hr  — WhatsApp templates don't change often
  PLATFORM_STATS:   120,    // 2 min — admin dashboard stats
  TRIAL_CONFIG:     600,    // 10 min — trial settings
  LEADERBOARD:      300,    // 5 min — leaderboard positions
  DAILY_REPORT:   86400,    // 24 hr  — daily digest
  SUBSCRIPTION:     120,    // 2 min — plan status checked on every page load
} as const;

// ── Canonical key builders — no typos, no key collisions ───────────────────
export const CacheKey = {
  studentProfile:  (id: string)    => `student:${id}:profile`,
  coinBalance:     (id: string)    => `wallet:${id}:balance`,
  subscription:    (id: string)    => `sub:${id}:status`,
  templateList:    ()              => `templates:list`,
  leaderboard:     (scope: string) => `leaderboard:${scope}`,
  platformStats:   ()              => `platform:stats`,
  dailyReport:     (date: string)  => `report:daily:${date}`,
} as const;

/**
 * Try Redis first; on miss call fetchFn and cache the result.
 * Silently falls back to fetchFn on any Redis error.
 */
export async function getOrCache<T>(
  key:       string,
  ttl:       number,
  fetchFn:   () => Promise<T>,
): Promise<T> {
  const redis = getRedis();

  if (redis) {
    try {
      const raw = await redis.get<unknown>(key);
      if (raw !== null && raw !== undefined) {
        return (typeof raw === "string" ? JSON.parse(raw) : raw) as T;
      }
    } catch (err) {
      console.warn(`[cache] Redis get failed — falling back to DB (key: ${key}):`, (err as Error).message);
    }
  }

  const data = await fetchFn();

  if (redis && data !== null && data !== undefined) {
    try {
      await redis.set(key, JSON.stringify(data), { ex: ttl });
    } catch (err) {
      console.warn(`[cache] Redis set failed (key: ${key}):`, (err as Error).message);
    }
  }

  return data;
}

/**
 * Delete one or more cache keys. Silently ignores Redis failures.
 * Call after writes that invalidate cached data.
 *
 *   await invalidateCache(CacheKey.coinBalance(userId), CacheKey.platformStats());
 */
export async function invalidateCache(...keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.del(...(keys as [string, ...string[]]));
  } catch (err) {
    console.warn("[cache] Invalidation failed:", (err as Error).message);
  }
}
