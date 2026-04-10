import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/** Local calendar day bounds (matches `studySession` “today” queries). */
function localDayBounds(d: Date): { start: Date; end: Date } {
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

function sumMeetPresenceSecondsForWindow(
  rows: { startedAt: Date; endedAt: Date | null; lastHeartbeatAt: Date }[],
  windowStart: Date,
  windowEnd: Date,
  now: Date
): number {
  let total = 0;
  for (const s of rows) {
    const end = s.endedAt ?? s.lastHeartbeatAt ?? now;
    const a = Math.max(s.startedAt.getTime(), windowStart.getTime());
    const b = Math.min(end.getTime(), windowEnd.getTime());
    if (b > a) total += (b - a) / 1000;
  }
  return total;
}

function sumMeetPresenceSecondsAllTime(
  rows: { startedAt: Date; endedAt: Date | null; lastHeartbeatAt: Date }[],
  now: Date
): number {
  let total = 0;
  for (const s of rows) {
    const end = s.endedAt ?? s.lastHeartbeatAt ?? now;
    total += Math.max(0, (end.getTime() - s.startedAt.getTime()) / 1000);
  }
  return total;
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let userId = (session.user as { id?: string }).id;
    if (!userId && session.user?.email) {
      const dbUser = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
      if (dbUser) userId = dbUser.id;
    }

    if (!userId) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const now = new Date();

    const [profile, studyStreak, sessionsToday, allSessions, meetPresenceRows, firstSub, user] = await Promise.all([
      prisma.profile.findUnique({
        where: { userId },
        select: {
          totalStudyHours: true,
          targetYear: true,
          targetExam: true,
        },
      }),
      prisma.studyStreak.findUnique({
        where: { userId },
        select: { currentDays: true, longestDays: true },
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
      prisma.meetPresenceSession.findMany({
        where: { userId },
        select: { startedAt: true, endedAt: true, lastHeartbeatAt: true },
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

    const minutesByDate: Record<string, number> = {};
    for (const s of allSessions) {
      const key = new Date(s.startedAt).toISOString().slice(0, 10);
      minutesByDate[key] = (minutesByDate[key] ?? 0) + (s.durationMinutes ?? 0);
    }
    for (const m of meetPresenceRows) {
      const key = new Date(m.startedAt).toISOString().slice(0, 10);
      const endT = m.endedAt ?? m.lastHeartbeatAt ?? now;
      const durationMins = Math.max(0, (endT.getTime() - m.startedAt.getTime()) / 60000);
      minutesByDate[key] = (minutesByDate[key] ?? 0) + durationMins;
    }
    const totalAttendance = Object.values(minutesByDate).filter((m) => m >= 10).length;

    const startDate = firstSub?.createdAt ?? user?.createdAt ?? null;
    const totalDaysSinceStart = startDate
      ? Math.max(0, Math.ceil((now.getTime() - new Date(startDate).getTime()) / (24 * 60 * 60 * 1000)))
      : 0;
    const totalAbsent = Math.max(0, totalDaysSinceStart - totalAttendance);

    const { start: localTodayStart, end: localTodayEnd } = localDayBounds(now);
    const meetSecondsToday = sumMeetPresenceSecondsForWindow(
      meetPresenceRows,
      localTodayStart,
      localTodayEnd,
      now
    );
    const meetSecondsTotal = sumMeetPresenceSecondsAllTime(meetPresenceRows, now);

    const studyHoursToday = sessionsToday.reduce((sum: number, s: any) => sum + (s.durationMinutes ?? 0), 0) / 60;
    const meetHoursToday = meetSecondsToday / 3600;
    const hoursToday = studyHoursToday + meetHoursToday;

    const profileHours = profile?.totalStudyHours ?? 0;
    const meetHoursTotal = meetSecondsTotal / 3600;
    const totalStudyHours = profileHours + meetHoursTotal;
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
      currentStreak: studyStreak?.currentDays ?? 0,
      longestStreak: studyStreak?.longestDays ?? 0,
      totalStudyHours,
      hoursToday,
      sessionsToday: sessionsToday.length,
      goalCountdown,
      targetYear,
      targetExam: profile?.targetExam ?? null,
      totalAttendance,
      totalAbsent,
    });
  } catch (e) {
    console.error("GET /api/dashboard/stats:", e);
    return NextResponse.json({ error: "Failed to load stats" }, { status: 500 });
  }
}
