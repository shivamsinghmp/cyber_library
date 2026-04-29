import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/api-helpers";

/** GET: Revenue trends (last 14 days) and popular slots for admin dashboard. */
export async function GET() {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    const { user } = auth;

    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 14);
    start.setHours(0, 0, 0, 0);

    const transactionAggregations = await prisma.transaction.groupBy({
      by: ["createdAt"],
      where: {
        status: "SUCCESS",
        createdAt: { gte: start },
      },
      _sum: { amount: true },
    });

    const totalRevenue = transactionAggregations.reduce((s, t) => s + (t._sum.amount ?? 0), 0);
    const byDay = new Map<string, number>();
    for (let d = 0; d < 14; d++) {
      const day = new Date(start);
      day.setDate(day.getDate() + d);
      byDay.set(day.toISOString().slice(0, 10), 0);
    }
    for (const t of transactionAggregations) {
      const key = t.createdAt.toISOString().slice(0, 10);
      if (byDay.has(key)) byDay.set(key, (byDay.get(key) ?? 0) + (t._sum.amount ?? 0));
    }
    const revenueByDay = Array.from(byDay.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, amount]) => ({ date, amount }));

    const subs = await prisma.roomSubscription.groupBy({
      by: ["studySlotId"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 10,
    });
    const slotIds = subs.map((s) => s.studySlotId);
    const slots = await prisma.studySlot.findMany({
      where: { id: { in: slotIds } },
      select: { id: true, name: true, timeLabel: true },
    });
    const slotMap = new Map(slots.map((s) => [s.id, s]));
    const popularSlots = subs.map((s) => ({
      slotId: s.studySlotId,
      name: slotMap.get(s.studySlotId)?.name ?? "Unknown",
      timeLabel: slotMap.get(s.studySlotId)?.timeLabel ?? "",
      count: s._count.id,
    }));

    const studyAggregations = await prisma.studySession.groupBy({
      by: ["startedAt"],
      where: { startedAt: { gte: start }, durationMinutes: { not: null } },
      _sum: { durationMinutes: true },
    });
    const studyByDay = new Map<string, number>();
    for (let d = 0; d < 14; d++) {
      const day = new Date(start);
      day.setDate(day.getDate() + d);
      studyByDay.set(day.toISOString().slice(0, 10), 0);
    }
    for (const s of studyAggregations) {
      const key = s.startedAt.toISOString().slice(0, 10);
      if (studyByDay.has(key)) studyByDay.set(key, (studyByDay.get(key) ?? 0) + (s._sum.durationMinutes ?? 0));
    }
    const studyHoursByDay = Array.from(studyByDay.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, minutes]) => ({ date, hours: Math.round((minutes / 60) * 10) / 10 }));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalStudyResult,
      todayRevenue,
      newStudentsThisWeek,
      activeSessionsNow,
      pendingFeedback,
      totalTransactions,
    ] = await Promise.all([
      prisma.profile.aggregate({ _sum: { totalStudyHours: true } }),
      prisma.transaction.aggregate({
        where: { status: "SUCCESS", createdAt: { gte: today } },
        _sum: { amount: true },
      }),
      prisma.user.count({
        where: {
          role: "STUDENT",
          createdAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.studySession.count({
        where: { startedAt: { gte: new Date(Date.now() - 30 * 60 * 1000) }, endedAt: null },
      }),
      prisma.feedback.count({ where: { status: "OPEN" } }).catch(() => 0),
      prisma.transaction.count({ where: { status: "SUCCESS" } }),
    ]);

    const totalPlatformStudyHours = totalStudyResult._sum.totalStudyHours ?? 0;

    return NextResponse.json({
      totalRevenue,
      revenueByDay,
      popularSlots,
      studyHoursByDay,
      totalPlatformStudyHours,
      todayRevenue: todayRevenue._sum.amount ?? 0,
      newStudentsThisWeek,
      activeSessionsNow,
      pendingFeedback,
      totalTransactions,
    });
  } catch (e) {
    console.error("GET /api/admin/analytics:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
