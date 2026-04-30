import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { fetchWithCache } from "@/lib/redis";

type UserRow = {
  id: string;
  name: string | null;
  email: string | null;
  profile: { fullName: string | null } | null;
  studyStreak: { currentDays: number } | null;
  studentId?: string | null;
};


const CACHE_TTL = {
  today: 60,      // 1 min — changes frequently
  weekly: 300,    // 5 min
  alltime: 600,   // 10 min
};

/** GET: Global study leaderboard. Query ?period=today|weekly|alltime. Returns top 10 by study hours. */
export async function GET(request: Request) {
  try {
    const session = await auth();
    const { searchParams } = new URL(request.url);
    const period = (searchParams.get("period") || "weekly") as "today" | "weekly" | "alltime";
    const now = new Date();

    // Cache the top-10 list (not user-specific rank)
    const cacheKey = `leaderboard:${period}:${now.toISOString().slice(0, 10)}`;
    const ttl = CACHE_TTL[period] ?? 300;

    const leaderboard = await fetchWithCache(
      cacheKey,
      async () => {
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
          // Use aggregate groupBy instead of findMany + JS reduce (much faster at scale)
          const grouped = await prisma.studySession.groupBy({
            by: ["userId"],
            where: { startedAt: { gte: start }, durationMinutes: { not: null } },
            _sum: { durationMinutes: true },
            orderBy: { _sum: { durationMinutes: "desc" } },
            take: 10,
          });
          byUser = new Map(grouped.map((g) => [g.userId, g._sum.durationMinutes ?? 0]));
        }

        const sorted = Array.from(byUser.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([userId]) => userId);

        if (sorted.length === 0) return [];

        const [users, coinRows] = await Promise.all([
          prisma.user.findMany({
            where: { id: { in: sorted }, deletedAt: null },
            select: {
              id: true,
              name: true,
              email: true,
              profile: { select: { fullName: true } },
              studyStreak: { select: { currentDays: true } },
            },
          }),
          prisma.studyCoinLog.groupBy({
            by: ["userId"],
            where: { userId: { in: sorted } },
            _sum: { coins: true },
          }),
        ]);

        const userMap = new Map<string, UserRow>(users.map((u) => [u.id, u as UserRow]));
        const coinsByUser = new Map(coinRows.map((r) => [r.userId, r._sum.coins ?? 0]));

        return sorted.map((userId, i) => {
          const u = userMap.get(userId);
          const mins = byUser.get(userId) ?? 0;
          const displayName =
            u?.profile?.fullName?.trim() ||
            u?.name?.trim() ||
            (u?.email ? u.email.split("@")[0] : null) ||
            "Student";
          return {
            rank: i + 1,
            userId,
            name: displayName,
            totalMinutes: mins,
            totalHours: Math.round((mins / 60) * 10) / 10,
            coins: coinsByUser.get(userId) ?? 0,
            streakDays: u?.studyStreak?.currentDays ?? 0,
          };
        });
      },
      ttl
    );

    const currentUserId = (session?.user as { id?: string })?.id;
    const myEntry = currentUserId
      ? (leaderboard as Array<{ userId: string; rank: number; totalHours: number }>).find((e) => e.userId === currentUserId)
      : null;

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
