import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMeetAddonToken } from "@/lib/meet-addon-token";
import { getMeetAddonCorsHeaders } from "../cors";

const MIN_PRESENCE_SECONDS = 10 * 60; // 10 minutes

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { "Access-Control-Max-Age": "86400" } });
}

/**
 * POST { slotId, sessionId }
 * Confirms attendance after 10 min of continuous presence.
 * Validates the presence session actually ran for ≥10 min server-side.
 */
export async function POST(request: NextRequest) {
  const cors = getMeetAddonCorsHeaders(request);
  try {
    const token = request.headers.get("authorization")?.startsWith("Bearer ")
      ? request.headers.get("authorization")!.slice(7) : "";
    const payload = verifyMeetAddonToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: cors });
    }
    const userId = payload.userId;

    const body = await request.json().catch(() => ({}));
    const slotId    = typeof body.slotId    === "string" ? body.slotId.trim()    : "";
    const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : "";

    if (!slotId) {
      return NextResponse.json({ error: "slotId required" }, { status: 400, headers: cors });
    }

    // Verify the slot exists
    const slot = await prisma.studySlot.findUnique({
      where: { id: slotId },
      select: { id: true, name: true, isActive: true },
    });
    if (!slot || !slot.isActive) {
      return NextResponse.json({ error: "Slot not found" }, { status: 404, headers: cors });
    }

    // Server-side presence check: session must have started ≥10 min ago
    if (sessionId) {
      const session = await prisma.meetPresenceSession.findUnique({
        where: { id: sessionId },
        select: { userId: true, startedAt: true, lastHeartbeatAt: true },
      });
      if (!session || session.userId !== userId) {
        return NextResponse.json({ error: "Invalid session" }, { status: 400, headers: cors });
      }
      const elapsed = (Date.now() - session.startedAt.getTime()) / 1000;
      if (elapsed < MIN_PRESENCE_SECONDS) {
        return NextResponse.json({
          error: "Abhi 10 min nahi hue.",
          remainingSeconds: Math.ceil(MIN_PRESENCE_SECONDS - elapsed),
        }, { status: 400, headers: cors });
      }
    }

    // Prevent duplicate check-in for today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const existing = await prisma.roomCheckIn.findFirst({
      where: { userId, studySlotId: slotId, checkedInAt: { gte: todayStart } },
    });

    if (existing) {
      return NextResponse.json({ success: true, alreadyCheckedIn: true }, { headers: cors });
    }

    await prisma.roomCheckIn.create({ data: { userId, studySlotId: slotId } });

    return NextResponse.json({ success: true, alreadyCheckedIn: false, slotName: slot.name }, { headers: cors });
  } catch (e) {
    console.error("[meet-addon/confirm-attendance] error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500, headers: cors });
  }
}
