import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/** GET: Global study leaderboard. Query ?period=today|weekly|alltime. Returns top 10 by study hours. */
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "weekly";
    const now = new Date();

    let byUser: Map<string, number>;

    if (period === "alltime") {
      const profiles = await prisma.profile.findMany({
        where: { totalStudyHours: { gt: 0 } },
        select: { userId: true, totalStudyHours: true },
        orderBy: { totalStudyHours: "desc" },
        take: 10,
      });
      byUser = new Map(profiles.map((p) => [p.userId, p.totalStudyHours * 60]));
    } else {
      let start: Date;
      if (period === "today") {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else {
        start = new Date(now);
        start.setDate(start.getDate() - 7);
        start.setHours(0, 0, 0, 0);
      }
      const sessions = await prisma.studySession.findMany({
        where: { startedAt: { gte: start }, durationMinutes: { not: null } },
        select: { userId: true, durationMinutes: true },
      });
      byUser = new Map<string, number>();
      for (const s of sessions) {
        const mins = s.durationMinutes ?? 0;
        byUser.set(s.userId, (byUser.get(s.userId) ?? 0) + mins);
      }
    }

    const sorted = Array.from(byUser.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([userId]) => userId);

    if (sorted.length === 0) {
      return NextResponse.json({ leaderboard: [], period });
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
        totalMinutes: mins,
        totalHours: Math.round((mins / 60) * 10) / 10,
        coins: coinsByUser.get(userId) ?? 0,
        streakDays: u?.studyStreak?.currentDays ?? 0,
      };
    });

    const currentUserId = (session.user as { id?: string }).id;
    const myEntry = leaderboard.find((e) => e.userId === currentUserId);

    return NextResponse.json({
      leaderboard,
      period,
      myRank: myEntry ? myEntry.rank : null,
      myHours: myEntry ? myEntry.totalHours : null,
    });
  } catch (e) {
    console.error("GET /api/study/leaderboard:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
