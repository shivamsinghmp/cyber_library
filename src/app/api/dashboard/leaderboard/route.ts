import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/** GET: Weekly study leaderboard — top users by study hours in the last 7 days. */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);

    const sessions = await prisma.studySession.findMany({
      where: {
        startedAt: { gte: weekStart },
        durationMinutes: { not: null },
      },
      select: {
        userId: true,
        durationMinutes: true,
      },
    });

    const byUser = new Map<string, number>();
    for (const s of sessions) {
      const mins = s.durationMinutes ?? 0;
      byUser.set(s.userId, (byUser.get(s.userId) ?? 0) + mins);
    }

    const sorted = Array.from(byUser.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([userId]) => userId);

    if (sorted.length === 0) {
      return NextResponse.json({ leaderboard: [] });
    }

    const users = await prisma.user.findMany({
      where: { id: { in: sorted }, deletedAt: null },
      select: {
        id: true,
        name: true,
        profile: { select: { fullName: true } },
        studyStreak: { select: { currentDays: true } },
      },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));
    const coinsByUser = new Map<string, number>();
    const coinRows = await prisma.studyCoinLog.groupBy({
      by: ["userId"],
      where: { userId: { in: sorted } },
      _sum: { coins: true },
    });
    for (const row of coinRows) coinsByUser.set(row.userId, row._sum.coins ?? 0);

    const leaderboard = sorted.map((userId, i) => {
      const u = userMap.get(userId);
      const mins = byUser.get(userId) ?? 0;
      return {
        rank: i + 1,
        userId,
        name: u?.name || u?.profile?.fullName || "Anonymous",
        weeklyMinutes: mins,
        weeklyHours: Math.round((mins / 60) * 10) / 10,
        coins: coinsByUser.get(userId) ?? 0,
        streakDays: u?.studyStreak?.currentDays ?? 0,
      };
    });

    return NextResponse.json({ leaderboard });
  } catch (e) {
    console.error("GET /api/dashboard/leaderboard:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
