import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/api-helpers";

type UserRow = {
  id: string;
  name: string | null;
  email: string | null;
  profile: { fullName: string | null } | null;
  studyStreak: { currentDays: number } | null;
  studentId?: string | null;
};


/** GET: Admin-only study leaderboard by period (week = last 7 days, month = last 30 days). */
export async function GET(request: Request) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    // auth verified (user identity confirmed by requireSuperAdmin/requireAdmin)

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") === "month" ? "month" : "week";

    const now = new Date();
    const days = period === "month" ? 30 : 7;
    const start = new Date(now);
    start.setDate(start.getDate() - days);
    start.setHours(0, 0, 0, 0);

    const sessions = await prisma.studySession.findMany({
      where: {
        startedAt: { gte: start },
        durationMinutes: { not: null },
      },
      select: { userId: true, durationMinutes: true },
    });

    const byUser = new Map<string, number>();
    for (const s of sessions) {
      const mins = s.durationMinutes ?? 0;
      byUser.set(s.userId, (byUser.get(s.userId) ?? 0) + mins);
    }

    const sorted = Array.from(byUser.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([userId]) => userId);

    if (sorted.length === 0) {
      return NextResponse.json({ leaderboard: [], period });
    }

    const users = await prisma.user.findMany({
      where: { id: { in: sorted }, role: "STUDENT", deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        studentId: true,
        profile: { select: { fullName: true } },
      },
    });
    const userMap = new Map<string, UserRow>(users.map((u) => [u.id, u as UserRow]));

    const leaderboard = sorted
      .filter((id) => userMap.has(id))
      .map((userId, i) => {
        const u = userMap.get(userId)!;
        const mins = byUser.get(userId) ?? 0;
        return {
          rank: i + 1,
          userId,
          name: u.name || u.profile?.fullName || "Anonymous",
          email: u.email,
          studentId: u.studentId,
          studyMinutes: mins,
          studyHours: Math.round((mins / 60) * 10) / 10,
        };
      });

    return NextResponse.json({ leaderboard, period });
  } catch (e) {
    console.error("GET /api/admin/study-leaderboard:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
