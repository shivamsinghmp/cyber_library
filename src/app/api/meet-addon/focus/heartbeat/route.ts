import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMeetAddonToken } from "@/lib/meet-addon-token";
import { getMeetAddonCorsHeaders } from "../../cors";
import { getCoinDelta } from "@/lib/gamification/awards";

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
    select: { id: true, roomKey: true },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { "Access-Control-Max-Age": "86400" } });
}

export async function POST(request: NextRequest) {
  const cors = getMeetAddonCorsHeaders(request);
  const userId = authUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: cors });
  }
  const body = await request.json().catch(() => ({}));
  const roomKey = typeof body.roomId === "string" ? body.roomId.trim() : "local-room";
  const workMinutes = typeof body.workMinutes === "number" ? body.workMinutes : 25;
  const breakMinutes = typeof body.breakMinutes === "number" ? body.breakMinutes : 5;
  const cycles = typeof body.cycles === "number" ? body.cycles : 0;
  const completeCycle = body.completeCycle === true;

  const room = await ensureRoom(roomKey);
  const session = await prisma.focusSession.create({
    data: { roomId: room.id, userId, workMinutes, breakMinutes, cycles },
    select: { id: true },
  });

  if (completeCycle) {
    await prisma.studyCoinLog.create({
      data: {
        userId,
        roomId: room.id,
        reason: "POMODORO_CYCLE_COMPLETED",
        coins: getCoinDelta("POMODORO_CYCLE_COMPLETED"),
      },
    });
  }

  return NextResponse.json({ ok: true, sessionId: session.id }, { headers: cors });
}
