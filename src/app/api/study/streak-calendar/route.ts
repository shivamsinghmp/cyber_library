import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as { id?: string }).id;
    if (!userId) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const monthParam = searchParams.get("month"); // YYYY-MM
    const now = new Date();
    const year = monthParam ? parseInt(monthParam.slice(0, 4), 10) : now.getFullYear();
    const month = monthParam ? parseInt(monthParam.slice(5, 7), 10) - 1 : now.getMonth();
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0, 23, 59, 59, 999);

    const sessions = await prisma.studySession.findMany({
      where: {
        userId,
        startedAt: { gte: start, lte: end },
        durationMinutes: { not: null },
      },
      select: { startedAt: true, durationMinutes: true },
    });

    const minutesByDate: Record<string, number> = {};
    for (const s of sessions) {
      const key = toDateOnly(new Date(s.startedAt));
      minutesByDate[key] = (minutesByDate[key] ?? 0) + (s.durationMinutes ?? 0);
    }
    const MIN_STUDY_MINUTES_FOR_STREAK = 30;
    const studiedDates = Object.entries(minutesByDate)
      .filter(([, mins]) => mins >= MIN_STUDY_MINUTES_FOR_STREAK)
      .map(([d]) => d)
      .sort();

    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: { currentStreak: true, longestStreak: true },
    });

    return NextResponse.json({
      studiedDates,
      currentStreak: profile?.currentStreak ?? 0,
      longestStreak: profile?.longestStreak ?? 0,
      month: `${year}-${String(month + 1).padStart(2, "0")}`,
    });
  } catch (e) {
    console.error("GET /api/study/streak-calendar:", e);
    return NextResponse.json({ error: "Failed to load streak data" }, { status: 500 });
  }
}
