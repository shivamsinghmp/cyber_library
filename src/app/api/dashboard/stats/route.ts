import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as { id?: string }).id;
    if (!userId) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const now = new Date();
    const today = toDateOnly(now);

    const [profile, sessionsToday, allSessions, firstSub, user] = await Promise.all([
      prisma.profile.findUnique({
        where: { userId },
        select: {
          currentStreak: true,
          longestStreak: true,
          totalStudyHours: true,
          targetYear: true,
          targetExam: true,
        },
      }),
      prisma.studySession.findMany({
        where: {
          userId,
          startedAt: {
            gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
            lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
          },
        },
        select: { durationMinutes: true, startedAt: true },
      }),
      prisma.studySession.findMany({
        where: { userId, durationMinutes: { not: null } },
        select: { startedAt: true, durationMinutes: true },
      }),
      prisma.roomSubscription.findFirst({
        where: { userId },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { createdAt: true },
      }),
    ]);

    const startDate = firstSub?.createdAt ?? user?.createdAt ?? null;

    const minutesByDate: Record<string, number> = {};
    for (const s of allSessions) {
      const key = new Date(s.startedAt).toISOString().slice(0, 10);
      minutesByDate[key] = (minutesByDate[key] ?? 0) + (s.durationMinutes ?? 0);
    }
    const totalAttendance = Object.values(minutesByDate).filter((m) => m >= 30).length;

    const startDate = firstSubOrUser ?? userCreated;
    const totalDaysSinceStart = startDate
      ? Math.max(0, Math.ceil((now.getTime() - new Date(startDate).getTime()) / (24 * 60 * 60 * 1000)))
      : 0;
    const totalUnattendance = Math.max(0, totalDaysSinceStart - totalAttendance);

    const hoursToday =
      sessionsToday.reduce((sum, s) => sum + (s.durationMinutes ?? 0), 0) / 60;
    const targetYear = profile?.targetYear ? parseInt(profile.targetYear, 10) : null;
    const endOfTarget =
      targetYear != null && !Number.isNaN(targetYear)
        ? new Date(targetYear, 11, 31)
        : null;
    const goalCountdown =
      endOfTarget && endOfTarget > now
        ? Math.ceil((endOfTarget.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
        : null;

    return NextResponse.json({
      currentStreak: profile?.currentStreak ?? 0,
      longestStreak: profile?.longestStreak ?? 0,
      totalStudyHours: profile?.totalStudyHours ?? 0,
      hoursToday: Math.round(hoursToday * 10) / 10,
      sessionsToday: sessionsToday.length,
      goalCountdown,
      targetYear,
      targetExam: profile?.targetExam ?? null,
      totalAttendance,
      totalUnattendance,
    });
  } catch (e) {
    console.error("GET /api/dashboard/stats:", e);
    return NextResponse.json({ error: "Failed to load stats" }, { status: 500 });
  }
}
