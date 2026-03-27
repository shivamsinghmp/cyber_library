import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMeetAddonToken } from "@/lib/meet-addon-token";
import { getMeetAddonCorsHeaders } from "../cors";

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
 * POST {
 *   roomKey: string,
 *   plannedSeconds: number,
 *   completedSeconds: number,
 *   completedFully: boolean
 * }
 */
export async function POST(request: NextRequest) {
  const cors = getMeetAddonCorsHeaders(request);
  const userId = authUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: cors });
  }

  const body = await request.json().catch(() => ({}));
  const roomKey = typeof body.roomKey === "string" && body.roomKey.trim() ? body.roomKey.trim() : "local-room";
  const plannedSeconds = typeof body.plannedSeconds === "number" ? Math.max(0, Math.floor(body.plannedSeconds)) : 0;
  let completedSeconds =
    typeof body.completedSeconds === "number" ? Math.max(0, Math.floor(body.completedSeconds)) : 0;
  const completedFully = body.completedFully === true;

  if (plannedSeconds <= 0) {
    return NextResponse.json({ ok: true, skipped: true }, { headers: cors });
  }
  if (completedSeconds > plannedSeconds) {
    completedSeconds = plannedSeconds;
  }
  if (!completedFully && completedSeconds <= 0) {
    return NextResponse.json({ ok: true, skipped: true }, { headers: cors });
  }

  const room = await ensureRoom(roomKey);
  const endedAt = new Date();
  const done = completedFully ? plannedSeconds : Math.min(completedSeconds, plannedSeconds);
  const startedAt = new Date(endedAt.getTime() - done * 1000);

  const row = await prisma.pomodoroTimerSession.create({
    data: {
      userId,
      roomId: room.id,
      plannedSeconds,
      completedSeconds: done,
      completedFully,
      startedAt,
      endedAt,
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, id: row.id }, { headers: cors });
}
