import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/health
 * Health check endpoint for uptime monitoring (Better Uptime, DO health checks, etc.)
 * Returns 200 if DB is alive, 503 if DB is down.
 */
export async function GET() {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "ok",
      db: "connected",
      latencyMs: Date.now() - start,
      ts: new Date().toISOString(),
    });
  } catch (e) {
    console.error("/api/health DB check failed:", e);
    return NextResponse.json(
      { status: "error", db: "unreachable", ts: new Date().toISOString() },
      { status: 503 }
    );
  }
}
