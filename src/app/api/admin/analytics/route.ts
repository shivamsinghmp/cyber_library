import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const role = (u: unknown) => (u as { role?: string })?.role;

/** GET: Revenue trends (last 14 days) and popular slots for admin dashboard. */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || role(session.user) !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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

    const totalStudyResult = await prisma.profile.aggregate({
      _sum: { totalStudyHours: true },
    });
    const totalPlatformStudyHours = totalStudyResult._sum.totalStudyHours ?? 0;

    return NextResponse.json({
      totalRevenue,
      revenueByDay,
      popularSlots,
      studyHoursByDay,
      totalPlatformStudyHours,
    });
  } catch (e) {
    console.error("GET /api/admin/analytics:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
