import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-helpers";

/**
 * GET /api/admin/slot-time?slotId=xxx&date=2026-04-30
 * Returns per-student time breakdown for a slot on a given date.
 * Used in admin panel to see who studied how long in each slot.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { searchParams } = request.nextUrl;
    const slotId = searchParams.get("slotId")?.trim();
    const dateStr = searchParams.get("date")?.trim();

    if (!slotId) return NextResponse.json({ error: "slotId required" }, { status: 400 });

    // Find the MeetRoom that corresponds to this slotId (roomKey = slotId)
    const room = await prisma.meetRoom.findUnique({
      where: { roomKey: slotId },
      select: { id: true },
    });

    if (!room) return NextResponse.json({ students: [], totalSeconds: 0 });

    // Date filter
    const dayStart = dateStr ? new Date(`${dateStr}T00:00:00.000Z`) : new Date();
    if (!dateStr) dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);

    // Get all completed presence sessions for this room on this date
    const sessions = await prisma.meetPresenceSession.findMany({
      where: {
        roomId: room.id,
        startedAt: { gte: dayStart, lt: dayEnd },
      },
      select: {
        id: true,
        userId: true,
        startedAt: true,
        endedAt: true,
        durationSeconds: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            profile: { select: { fullName: true } },
          },
        },
      },
      orderBy: { startedAt: "asc" },
    });

    // Group by userId
    type StudentTime = {
      userId: string;
      name: string;
      email: string;
      totalSeconds: number;
      sessions: { startedAt: string; endedAt: string | null; durationSeconds: number }[];
    };
    const byUser = new Map<string, StudentTime>();

    for (const s of sessions) {
      const dur = s.durationSeconds ?? 0;
      const name = s.user.profile?.fullName?.trim() || s.user.name?.trim() || s.user.email?.split("@")[0] || "Student";
      const existing = byUser.get(s.userId);
      if (existing) {
        existing.totalSeconds += dur;
        existing.sessions.push({
          startedAt: s.startedAt.toISOString(),
          endedAt: s.endedAt?.toISOString() ?? null,
          durationSeconds: dur,
        });
      } else {
        byUser.set(s.userId, {
          userId: s.userId,
          name,
          email: s.user.email ?? "",
          totalSeconds: dur,
          sessions: [{
            startedAt: s.startedAt.toISOString(),
            endedAt: s.endedAt?.toISOString() ?? null,
            durationSeconds: dur,
          }],
        });
      }
    }

    const students = Array.from(byUser.values())
      .sort((a, b) => b.totalSeconds - a.totalSeconds);

    const totalSeconds = students.reduce((s, u) => s + u.totalSeconds, 0);

    return NextResponse.json({ students, totalSeconds, date: dayStart.toISOString().slice(0, 10) });
  } catch (e) {
    console.error("[admin/slot-time] GET error:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
