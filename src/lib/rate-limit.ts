export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

const rateLimiterCache = new Map<string, { count: number; resetTime: number }>();

// Prune expired entries every 5 minutes to prevent unbounded memory growth.
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimiterCache) {
      if (now > record.resetTime) rateLimiterCache.delete(key);
    }
  }, 5 * 60 * 1000);
}

export function rateLimit(identifier: string, limit: number, windowInSeconds: number): RateLimitResult {
  const now = Date.now();
  const windowMs = windowInSeconds * 1000;

  const record = rateLimiterCache.get(identifier);

  if (!record) {
    rateLimiterCache.set(identifier, { count: 1, resetTime: now + windowMs });
    return { success: true, limit, remaining: limit - 1, reset: now + windowMs };
  }

  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + windowMs;
    return { success: true, limit, remaining: limit - 1, reset: record.resetTime };
  }

  if (record.count >= limit) {
    return { success: false, limit, remaining: 0, reset: record.resetTime };
  }

  record.count++;
  return { success: true, limit, remaining: limit - record.count, reset: record.resetTime };
}

/**
 * Same windowing as {@link rateLimit}, but window is in milliseconds and result uses `ok`.
 */
export function checkRateLimit(
  identifier: string,
  limit: number,
  windowMs: number
): { ok: boolean; limit: number; remaining: number; reset: number } {
  const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));
  const r = rateLimit(identifier, limit, windowSeconds);
  return {
    ok: r.success,
    limit: r.limit,
    remaining: r.remaining,
    reset: r.reset,
  };
}
