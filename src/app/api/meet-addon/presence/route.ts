import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMeetAddonToken } from "@/lib/meet-addon-token";
import { getMeetAddonCorsHeaders } from "../cors";
import { maybeApplyStudyStreakFromMeetPresence } from "@/lib/gamification/study-streak";

// Session is "dead" if no heartbeat for 90 seconds
const HEARTBEAT_EXPIRY_MS = 90 * 1000;

function authUserId(request: NextRequest): string | null {
  const token = request.headers.get("authorization")?.startsWith("Bearer ")
    ? request.headers.get("authorization")!.slice(7) : "";
  return verifyMeetAddonToken(token)?.userId ?? null;
}

async function ensureRoom(roomKey: string) {
  return prisma.meetRoom.upsert({
    where: { roomKey },
    create: { roomKey },
    update: {},
    select: { id: true },
  });
}

/** Calculate durationSeconds and close a session */
async function closeSession(sessionId: string, endedAt: Date) {
  const session = await prisma.meetPresenceSession.findUnique({
    where: { id: sessionId },
    select: { startedAt: true },
  });
  if (!session) return;
  const durationSeconds = Math.floor((endedAt.getTime() - session.startedAt.getTime()) / 1000);
  await prisma.meetPresenceSession.update({
    where: { id: sessionId },
    data: { endedAt, durationSeconds: Math.max(0, durationSeconds) },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { "Access-Control-Max-Age": "86400" } });
}

/**
 * POST { roomKey: string, event: "join" | "ping" | "end" }
 *
 * join → Create new presence session (called when slot is resolved)
 * ping → Heartbeat every 30s (updates lastHeartbeatAt)
 * end  → Student left Meet (closes session, saves durationSeconds)
 */
export async function POST(request: NextRequest) {
  const cors = getMeetAddonCorsHeaders(request);
  try {
    const userId = authUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: cors });
    }

    const body = await request.json().catch(() => ({}));
    const roomKey = typeof body.roomKey === "string" && body.roomKey.trim()
      ? body.roomKey.trim() : "local-room";
    const event = ["join", "ping", "end"].includes(body.event) ? body.event as "join" | "ping" | "end" : "ping";

    const room = await ensureRoom(roomKey);
    const now = new Date();

    // ── END: Student left Meet ────────────────────────────────────────────────
    if (event === "end") {
      // Close ALL active sessions for this user in this room
      const activeSessions = await prisma.meetPresenceSession.findMany({
        where: { userId, roomId: room.id, endedAt: null },
        select: { id: true, startedAt: true },
      });

      for (const s of activeSessions) {
        const dur = Math.max(0, Math.floor((now.getTime() - s.startedAt.getTime()) / 1000));
        await prisma.meetPresenceSession.update({
          where: { id: s.id },
          data: { endedAt: now, durationSeconds: dur },
        });
      }

      await maybeApplyStudyStreakFromMeetPresence(userId).catch(() => {});
      return NextResponse.json({ ok: true, sessionsEnded: activeSessions.length }, { headers: cors });
    }

    // ── PING / JOIN: Heartbeat or new join ────────────────────────────────────

    // First: expire ghost sessions (no heartbeat > 90s)
    const ghostCutoff = new Date(now.getTime() - HEARTBEAT_EXPIRY_MS);
    const ghosts = await prisma.meetPresenceSession.findMany({
      where: {
        userId,
        endedAt: null,
        lastHeartbeatAt: { lt: ghostCutoff },
      },
      select: { id: true, startedAt: true },
    });
    for (const g of ghosts) {
      // End at last heartbeat time (more accurate than now)
      const endAt = new Date(g.startedAt.getTime() +
        Math.max(0, Math.floor((ghostCutoff.getTime() - g.startedAt.getTime()))));
      const dur = Math.max(0, Math.floor((endAt.getTime() - g.startedAt.getTime()) / 1000));
      await prisma.meetPresenceSession.update({
        where: { id: g.id },
        data: { endedAt: endAt, durationSeconds: dur },
      });
    }

    // Check for existing active session in this room
    const existing = await prisma.meetPresenceSession.findFirst({
      where: { userId, roomId: room.id, endedAt: null },
      orderBy: { startedAt: "desc" },
    });

    if (existing) {
      // Just update heartbeat
      await prisma.meetPresenceSession.update({
        where: { id: existing.id },
        data: { lastHeartbeatAt: now },
      });
      await maybeApplyStudyStreakFromMeetPresence(userId).catch(() => {});
      return NextResponse.json({
        ok: true,
        sessionId: existing.id,
        startedAt: existing.startedAt.toISOString(),
        event: "heartbeat_updated",
      }, { headers: cors });
    }

    // No active session — create new one (join or reconnect)
    // Close any stale session in a different room first
    const otherRoom = await prisma.meetPresenceSession.findFirst({
      where: { userId, endedAt: null },
      select: { id: true, startedAt: true },
    });
    if (otherRoom) {
      await closeSession(otherRoom.id, now);
    }

    const created = await prisma.meetPresenceSession.create({
      data: {
        userId,
        roomId: room.id,
        startedAt: now,
        lastHeartbeatAt: now,
      },
      select: { id: true, startedAt: true },
    });

    await maybeApplyStudyStreakFromMeetPresence(userId).catch(() => {});

    return NextResponse.json({
      ok: true,
      sessionId: created.id,
      startedAt: created.startedAt.toISOString(),
      event: "session_created",
    }, { headers: cors });

  } catch (e) {
    console.error("[meet-addon/presence] POST error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500, headers: cors });
  }
}

/**
 * GET /api/meet-addon/presence?roomKey=xxx
 * Returns total time spent by user in a room today + all-time
 */
export async function GET(request: NextRequest) {
  const cors = getMeetAddonCorsHeaders(request);
  try {
    const userId = authUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: cors });
    }

    const roomKey = request.nextUrl.searchParams.get("roomKey")?.trim();
    if (!roomKey) {
      return NextResponse.json({ error: "roomKey required" }, { status: 400, headers: cors });
    }

    const room = await prisma.meetRoom.findUnique({
      where: { roomKey },
      select: { id: true },
    });
    if (!room) {
      return NextResponse.json({ todaySeconds: 0, totalSeconds: 0, sessions: [] }, { headers: cors });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // All completed sessions for this user in this room
    const sessions = await prisma.meetPresenceSession.findMany({
      where: { userId, roomId: room.id, endedAt: { not: null } },
      select: { id: true, startedAt: true, endedAt: true, durationSeconds: true },
      orderBy: { startedAt: "desc" },
      take: 50,
    });

    // Active session (if any)
    const activeSession = await prisma.meetPresenceSession.findFirst({
      where: { userId, roomId: room.id, endedAt: null },
      select: { id: true, startedAt: true, lastHeartbeatAt: true },
    });

    const todaySeconds = sessions
      .filter(s => s.startedAt >= todayStart)
      .reduce((sum, s) => sum + (s.durationSeconds ?? 0), 0);

    const totalSeconds = sessions
      .reduce((sum, s) => sum + (s.durationSeconds ?? 0), 0);

    // Add live seconds if currently active
    const liveSeconds = activeSession
      ? Math.floor((Date.now() - activeSession.startedAt.getTime()) / 1000) : 0;

    return NextResponse.json({
      todaySeconds: todaySeconds + liveSeconds,
      totalSeconds: totalSeconds + liveSeconds,
      activeSession: activeSession ? {
        id: activeSession.id,
        startedAt: activeSession.startedAt.toISOString(),
        liveSeconds,
      } : null,
      sessions: sessions.slice(0, 10).map(s => ({
        id: s.id,
        startedAt: s.startedAt.toISOString(),
        endedAt: s.endedAt?.toISOString(),
        durationSeconds: s.durationSeconds ?? 0,
      })),
    }, { headers: cors });

  } catch (e) {
    console.error("[meet-addon/presence] GET error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500, headers: cors });
  }
}
