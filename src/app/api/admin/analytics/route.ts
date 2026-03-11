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

    const transactions = await prisma.transaction.findMany({
      where: {
        status: "SUCCESS",
        createdAt: { gte: start },
      },
      select: { amount: true, createdAt: true },
    });

    const totalRevenue = transactions.reduce((s, t) => s + t.amount, 0);
    const byDay = new Map<string, number>();
    for (let d = 0; d < 14; d++) {
      const day = new Date(start);
      day.setDate(day.getDate() + d);
      const key = day.toISOString().slice(0, 10);
      byDay.set(key, 0);
    }
    for (const t of transactions) {
      const key = t.createdAt.toISOString().slice(0, 10);
      if (byDay.has(key)) byDay.set(key, (byDay.get(key) ?? 0) + t.amount);
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

    const studySessions = await prisma.studySession.findMany({
      where: { startedAt: { gte: start }, durationMinutes: { not: null } },
      select: { startedAt: true, durationMinutes: true },
    });
    const studyByDay = new Map<string, number>();
    for (let d = 0; d < 14; d++) {
      const day = new Date(start);
      day.setDate(day.getDate() + d);
      studyByDay.set(day.toISOString().slice(0, 10), 0);
    }
    for (const s of studySessions) {
      const key = s.startedAt.toISOString().slice(0, 10);
      if (studyByDay.has(key)) studyByDay.set(key, (studyByDay.get(key) ?? 0) + (s.durationMinutes ?? 0));
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
