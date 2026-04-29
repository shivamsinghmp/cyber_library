import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMeetAddonToken } from "@/lib/meet-addon-token";
import { getMeetAddonCorsHeaders } from "../cors";
import { maybeApplyStudyStreakFromMeetPresence } from "@/lib/gamification/study-streak";

function authUserId(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const payload = verifyMeetAddonToken(token);
  return payload?.userId ?? null;
}

async function ensureRoom(roomKey: string) {
  return prisma.meetRoom.upsert({
    where: { roomKey },
    create: { roomKey },
    update: {},
    select: { id: true },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { "Access-Control-Max-Age": "86400" } });
}

/**
 * POST { roomKey: string, event: "ping" | "end" }
 * ping: create or refresh session; end: close active session for this room.
 */
export async function POST(request: NextRequest) {
  try {
  const cors = getMeetAddonCorsHeaders(request);
  const userId = authUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: cors });
  }

  const body = await request.json().catch(() => ({}));
  const roomKey = typeof body.roomKey === "string" && body.roomKey.trim() ? body.roomKey.trim() : "local-room";
  const event = body.event === "end" ? "end" : "ping";

  const room = await ensureRoom(roomKey);

  if (event === "end") {
    const result = await prisma.meetPresenceSession.updateMany({
      where: { userId, roomId: room.id, endedAt: null },
      data: { endedAt: new Date() },
    });
    await maybeApplyStudyStreakFromMeetPresence(userId).catch(() => {});
    return NextResponse.json({ ok: true, sessionEnded: result.count }, { headers: cors });
  }

  const now = new Date();
  const active = await prisma.meetPresenceSession.findFirst({
    where: { userId, endedAt: null },
    orderBy: { startedAt: "desc" },
  });

  if (active) {
    if (active.roomId === room.id) {
      await prisma.meetPresenceSession.update({
        where: { id: active.id },
        data: { lastHeartbeatAt: now },
      });
      await maybeApplyStudyStreakFromMeetPresence(userId).catch(() => {});
      return NextResponse.json(
        { ok: true, sessionId: active.id, startedAt: active.startedAt.toISOString() },
        { headers: cors }
      );
    }
    await prisma.meetPresenceSession.update({
      where: { id: active.id },
      data: { endedAt: now },
    });
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

  return NextResponse.json(
    { ok: true, sessionId: created.id, startedAt: created.startedAt.toISOString() },
    { headers: cors }
  );
  } catch (e) {
    console.error("[meet-addon/presence] POST error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
