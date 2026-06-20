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
  today: 60,      // 1 min
  weekly: 120,    // 2 min — reduced so recent sessions appear sooner
  alltime: 600,   // 10 min
};

/** GET: Global study leaderboard — publicly accessible, no login required.
 *  Query ?period=today|weekly|alltime. Returns top entries sorted by watch time. */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = (searchParams.get("period") || "weekly") as "today" | "weekly" | "alltime";
    const now = new Date();

    // Cache the top-10 list (not user-specific rank)
    const cacheKey = `leaderboard:${period}:${now.toISOString().slice(0, 10)}`;
    const ttl = CACHE_TTL[period] ?? 120;

    const leaderboard = await fetchWithCache(
      cacheKey,
      async () => {
        let byUser: Map<string, number>;

        if (period === "alltime") {
          const [studyRows, closedMeetRows, activeMeetSessions] = await Promise.all([
            prisma.studySession.groupBy({
              by: ["userId"],
              where: { durationMinutes: { not: null } },
              _sum: { durationMinutes: true },
            }),
            prisma.meetPresenceSession.groupBy({
              by: ["userId"],
              where: { durationSeconds: { not: null } },
              _sum: { durationSeconds: true },
            }),
            // Active/ghost sessions not yet closed — use lastHeartbeatAt as conservative end
            prisma.meetPresenceSession.findMany({
              where: { endedAt: null },
              select: { userId: true, startedAt: true, lastHeartbeatAt: true },
            }),
          ]);
          byUser = new Map<string, number>();
          for (const s of studyRows) {
            byUser.set(s.userId, (byUser.get(s.userId) ?? 0) + (s._sum.durationMinutes ?? 0));
          }
          for (const m of closedMeetRows) {
            const mins = Math.floor((m._sum.durationSeconds ?? 0) / 60);
            byUser.set(m.userId, (byUser.get(m.userId) ?? 0) + mins);
          }
          for (const m of activeMeetSessions) {
            const end = m.lastHeartbeatAt ?? now;
            const mins = Math.floor(Math.max(0, end.getTime() - m.startedAt.getTime()) / 60000);
            if (mins > 0) byUser.set(m.userId, (byUser.get(m.userId) ?? 0) + mins);
          }
        } else {
          let start: Date;
          if (period === "today") {
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          } else {
            start = new Date(now);
            start.setDate(start.getDate() - 7);
            start.setHours(0, 0, 0, 0);
          }
          const [studyRows, closedMeetRows, activeMeetSessions] = await Promise.all([
            prisma.studySession.groupBy({
              by: ["userId"],
              where: { startedAt: { gte: start }, durationMinutes: { not: null } },
              _sum: { durationMinutes: true },
            }),
            prisma.meetPresenceSession.groupBy({
              by: ["userId"],
              where: { startedAt: { gte: start }, durationSeconds: { not: null } },
              _sum: { durationSeconds: true },
            }),
            prisma.meetPresenceSession.findMany({
              where: { startedAt: { gte: start }, endedAt: null },
              select: { userId: true, startedAt: true, lastHeartbeatAt: true },
            }),
          ]);
          byUser = new Map<string, number>();
          for (const s of studyRows) {
            byUser.set(s.userId, (byUser.get(s.userId) ?? 0) + (s._sum.durationMinutes ?? 0));
          }
          for (const m of closedMeetRows) {
            const mins = Math.floor((m._sum.durationSeconds ?? 0) / 60);
            byUser.set(m.userId, (byUser.get(m.userId) ?? 0) + mins);
          }
          for (const m of activeMeetSessions) {
            const end = m.lastHeartbeatAt ?? now;
            const mins = Math.floor(Math.max(0, end.getTime() - m.startedAt.getTime()) / 60000);
            if (mins > 0) byUser.set(m.userId, (byUser.get(m.userId) ?? 0) + mins);
          }
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

    // Optionally attach current user's rank if they are logged in
    let myRank: number | null = null, myHours: number | null = null;
    try {
      const session = await auth();
      const currentUserId = (session?.user as { id?: string })?.id;
      if (currentUserId) {
        const myEntry = (leaderboard as Array<{ userId: string; rank: number; totalMinutes: number; totalHours: number }>)
          .find((e) => e.userId === currentUserId);
        myRank  = myEntry?.rank         ?? null;
        myHours = myEntry?.totalMinutes ?? null;  // field name kept for API compat, value is now minutes
      }
    } catch { /* not logged in — skip silently */ }

    return NextResponse.json({ leaderboard, period, myRank, myHours });
  } catch (e) {
    console.error("GET /api/study/leaderboard:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
