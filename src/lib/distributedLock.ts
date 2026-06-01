/**
 * Redis-backed distributed lock — prevents race conditions in critical sections.
 *
 * Uses atomic SET NX (set-if-not-exists) for acquisition and a Lua script
 * for release, so a lock is never accidentally released by a different holder.
 *
 * Graceful degradation: if Redis is unavailable, fn runs without a lock.
 * Coin transactions have their own DB-level atomicity (prisma.$transaction +
 * conditional UPDATE), so occasional Redis unavailability is safe.
 *
 * Usage:
 *   import { withLock } from "@/lib/distributedLock";
 *
 *   await withLock(`coin:${userId}`, 10, async () => {
 *     await awardCoins(userId, 50, "Focus session");
 *   });
 */

import { Redis } from "@upstash/redis";
import { randomBytes } from "crypto";

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

// Lua: release only if we still own the lock (atomic compare-and-delete)
const RELEASE_SCRIPT = `
  if redis.call("GET", KEYS[1]) == ARGV[1] then
    return redis.call("DEL", KEYS[1])
  else
    return 0
  end
`;

/**
 * Acquire a Redis lock, run fn, release the lock.
 *
 * @param lockKey    Unique resource name, e.g. "coin:userId123"
 * @param ttl        Lock TTL in seconds — auto-expires if fn crashes
 * @param fn         The critical section to run exclusively
 * @throws Error("RESOURCE_LOCKED") if the lock is already held
 */
export async function withLock<T>(
  lockKey: string,
  ttl:     number,
  fn:      () => Promise<T>,
): Promise<T> {
  const redis   = getRedis();
  const fullKey = `lock:${lockKey}`;

  if (!redis) {
    // Redis unavailable — DB-level guards (Prisma conditional UPDATE) still apply
    return fn();
  }

  const lockVal = randomBytes(16).toString("hex");
  const acquired = await redis.set(fullKey, lockVal, { nx: true, ex: ttl });

  if (!acquired) {
    throw new Error("RESOURCE_LOCKED");
  }

  try {
    return await fn();
  } finally {
    await redis
      .eval(RELEASE_SCRIPT, [fullKey], [lockVal])
      .catch(err => console.warn(`[lock] Release failed for "${fullKey}":`, (err as Error).message));
  }
}
