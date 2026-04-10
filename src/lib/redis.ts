import { Redis } from "@upstash/redis";

/**
 * Initializes the Upstash Redis client.
 * In a serverless environment (like Vercel Edge/Node), HTTP-based 
 * clients avoid the overhead and limits of persistent TCP socket pooling.
 */

// Global pattern to prevent recreating instances during hot reloads in Next.js Dev
let redisClient: Redis | null = null;

export function getRedis() {
  if (redisClient) return redisClient;

  // We gracefully handle missing env variables mostly for build-time safety,
  // but heavily recommend configuring them in production.
  const url = process.env.UPSTASH_REDIS_REST_URL ?? "";
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? "";

  if (!url || !token) {
    console.warn("⚠️ UPSTASH_REDIS_REST_URL or TOKEN is missing. Redis Cache disabled.");
  }

  redisClient = new Redis({
    url: url || "https://dummy-url.upstash.io",
    token: token || "dummy-token",
  });

  return redisClient;
}

export const redis = getRedis();

/**
 * CACHE-ASIDE PATTERN:
 * Attempt to load data from Redis. If it misses, run `fetchFn()` to fetch from Postgres,
 * then store it in Redis with `ttl` (Time-to-Live) before returning.
 * 
 * @param key The unique string key for Redis
 * @param fetchFn The fallback async function that queries the Postgres database
 * @param ttlSeconds TTL before cache expires
 */
export async function fetchWithCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds: number = 3600 // default 1 hour
): Promise<T> {
  const isRedisConfigured = !!process.env.UPSTASH_REDIS_REST_URL;
  if (!isRedisConfigured) {
    // Graceful fallback to pure Postgres if Upstash isn't configured
    return await fetchFn();
  }

  try {
    const cachedData = await redis.get<T>(key);
    if (cachedData !== null) {
      return cachedData;
    }
  } catch (err) {
    console.error(`[Redis] GET Error for key ${key}:`, err);
  }

  // Cache-Miss (or error reading from cache): Fetch strictly from the DB
  const freshData = await fetchFn();

  try {
    // Asynchronously write back without awaiting heavily (fire and forget pattern for DB optimization)
    redis.setex(key, ttlSeconds, freshData).catch((e) => {
      console.error(`[Redis] SET Error for key ${key}:`, e);
    });
  } catch (err) {
    console.error(`[Redis] Post-Fetch SET Error for key ${key}:`, err);
  }

  return freshData;
}

/**
 * WRITE-THROUGH / INVALIDATION PATTERN:
 * Purges a key when mutative actions (POST/PATCH/DELETE) rewrite data.
 */
export async function invalidateCache(key: string) {
  if (!process.env.UPSTASH_REDIS_REST_URL) return;
  try {
    await redis.del(key);
  } catch (err) {
    console.error(`[Redis] DEL Error for key ${key}:`, err);
  }
}
