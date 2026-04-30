import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/api-helpers";
import { redis } from "@/lib/redis";

/**
 * POST /api/admin/cache-flush
 * Clears ALL Redis cache keys — use when data appears stale.
 */
export async function POST() {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;

    if (!process.env.UPSTASH_REDIS_REST_URL) {
      return NextResponse.json({ ok: true, message: "Redis not configured — no cache to clear" });
    }

    await redis.flushdb();
    console.info("Redis cache flushed by admin");

    return NextResponse.json({ ok: true, message: "Cache cleared successfully" });
  } catch (e) {
    console.error("[admin/cache-flush]:", e);
    return NextResponse.json({ error: "Failed to clear cache" }, { status: 500 });
  }
}
