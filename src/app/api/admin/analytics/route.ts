import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/api-helpers";

export async function GET() {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;

    const now = new Date();
    const start14 = new Date(now); start14.setDate(start14.getDate() - 14); start14.setHours(0,0,0,0);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // ── Parallel heavy queries ──────────────────────────────────────────────
    const [
      txAgg, studyAgg, subs, slots,
      totalStudyResult, todayRevenue,
      newStudentsThisWeek, activeSessionsNow,
      pendingFeedback, totalTransactions,
      totalVisitors, recentActivity,
      slotOccupancy,
    ] = await Promise.all([
      // Revenue by day (14d)
      prisma.transaction.groupBy({
        by: ["createdAt"],
        where: { status: "SUCCESS", createdAt: { gte: start14 } },
        _sum: { amount: true },
      }),
      // Study hours by day (14d)
      prisma.studySession.groupBy({
        by: ["startedAt"],
        where: { startedAt: { gte: start14 }, durationMinutes: { not: null } },
        _sum: { durationMinutes: true },
      }),
      // Popular slots
      prisma.roomSubscription.groupBy({
        by: ["studySlotId"],
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 8,
      }),
      // Slot details
      prisma.studySlot.findMany({ select: { id: true, name: true, timeLabel: true, capacity: true } }),
      // Platform totals
      prisma.profile.aggregate({ _sum: { totalStudyHours: true } }),
      prisma.transaction.aggregate({ where: { status: "SUCCESS", createdAt: { gte: today } }, _sum: { amount: true } }),
      prisma.user.count({ where: { role: "STUDENT", createdAt: { gte: weekAgo }, deletedAt: null } }),
      prisma.studySession.count({ where: { startedAt: { gte: new Date(Date.now() - 30 * 60 * 1000) }, endedAt: null } }),
      prisma.feedback.count({ where: { status: "OPEN" } }).catch(() => 0),
      prisma.transaction.count({ where: { status: "SUCCESS" } }),
      // Visitors today (for conversion)
      prisma.trafficVisit.count({ where: { createdAt: { gte: today } } }).catch(() => 0),
      // Recent activity feed (last 20 events merged)
      Promise.all([
        prisma.transaction.findMany({
          where: { status: "SUCCESS", createdAt: { gte: new Date(Date.now() - 2 * 60 * 60 * 1000) } },
          orderBy: { createdAt: "desc" }, take: 5,
          select: { id: true, amount: true, createdAt: true, user: { select: { name: true, email: true, profile: { select: { fullName: true } } } } },
        }),
        prisma.user.findMany({
          where: { role: "STUDENT", createdAt: { gte: new Date(Date.now() - 4 * 60 * 60 * 1000) } },
          orderBy: { createdAt: "desc" }, take: 5,
          select: { id: true, name: true, email: true, createdAt: true, profile: { select: { fullName: true } } },
        }),
        prisma.feedback.findMany({
          where: { createdAt: { gte: new Date(Date.now() - 4 * 60 * 60 * 1000) } },
          orderBy: { createdAt: "desc" }, take: 5,
          select: { id: true, subject: true, status: true, createdAt: true, user: { select: { name: true, email: true } } },
        }),
        prisma.studySession.findMany({
          where: { startedAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
          orderBy: { startedAt: "desc" }, take: 5,
          select: { id: true, startedAt: true, user: { select: { name: true, email: true, profile: { select: { fullName: true } } } } },
        }),
      ]),
      // Slot occupancy (active sessions per slot today)
      prisma.roomCheckIn.groupBy({
        by: ["studySlotId"],
        where: { checkedInAt: { gte: today } },
        _count: { id: true },
      }).catch(() => []),
    ]);

    // ── Revenue by day ──────────────────────────────────────────────────────
    const byDay = new Map<string, number>();
    for (let d = 0; d < 14; d++) {
      const day = new Date(start14); day.setDate(day.getDate() + d);
      byDay.set(day.toISOString().slice(0, 10), 0);
    }
    for (const t of txAgg) {
      const key = t.createdAt.toISOString().slice(0, 10);
      if (byDay.has(key)) byDay.set(key, (byDay.get(key) ?? 0) + (t._sum.amount ?? 0));
    }
    const revenueByDay = Array.from(byDay.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([date, amount]) => ({ date, amount }));

    // ── Study hours by day ──────────────────────────────────────────────────
    const studyByDay = new Map<string, number>();
    for (let d = 0; d < 14; d++) {
      const day = new Date(start14); day.setDate(day.getDate() + d);
      studyByDay.set(day.toISOString().slice(0, 10), 0);
    }
    for (const s of studyAgg) {
      const key = s.startedAt.toISOString().slice(0, 10);
      if (studyByDay.has(key)) studyByDay.set(key, (studyByDay.get(key) ?? 0) + (s._sum.durationMinutes ?? 0));
    }
    const studyHoursByDay = Array.from(studyByDay.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([date, minutes]) => ({ date, hours: Math.round((minutes / 60) * 10) / 10 }));

    // ── Sign-ups by day ──────────────────────────────────────────────────────
    const signupAgg = await prisma.user.groupBy({
      by: ["createdAt"],
      where: { role: "STUDENT", createdAt: { gte: start14 }, deletedAt: null },
      _count: { id: true },
    });
    const signupByDay = new Map<string, number>();
    for (let d = 0; d < 14; d++) {
      const day = new Date(start14); day.setDate(day.getDate() + d);
      signupByDay.set(day.toISOString().slice(0, 10), 0);
    }
    for (const s of signupAgg) {
      const key = s.createdAt.toISOString().slice(0, 10);
      if (signupByDay.has(key)) signupByDay.set(key, (signupByDay.get(key) ?? 0) + s._count.id);
    }
    const signupsByDay = Array.from(signupByDay.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([date, count]) => ({ date, count }));

    // ── Popular slots ────────────────────────────────────────────────────────
    const slotMap = new Map(slots.map((s) => [s.id, s]));
    const occMap = new Map((slotOccupancy as Array<{ studySlotId: string; _count: { id: number } }>).map((o) => [o.studySlotId, o._count.id]));
    type SlotInfo = { id: string; name: string; timeLabel: string; capacity: number };
    const popularSlots = subs.map((s) => {
      const slot = slotMap.get(s.studySlotId) as SlotInfo | undefined;
      return {
      slotId: s.studySlotId,
      name: slot?.name ?? "Unknown",
      timeLabel: slot?.timeLabel ?? "",
      capacity: slot?.capacity ?? 20,
      occupancy: occMap.get(s.studySlotId) ?? 0,
      count: s._count.id,
    };
    });

    // ── Activity feed ────────────────────────────────────────────────────────
    const [payments, signups, feedback, sessions] = recentActivity;
    const getName = (u: { name?: string | null; email?: string | null; profile?: { fullName?: string | null } | null } | null) =>
      u?.profile?.fullName?.trim() || u?.name?.trim() || (u?.email ? u.email.split("@")[0] : "Student");

    type ActivityItem = { id: string; type: string; label: string; sub: string; time: string };
    const feed: ActivityItem[] = [
      ...payments.map((p) => ({ id: p.id, type: "payment", label: getName(p.user), sub: `₹${p.amount.toLocaleString("en-IN")} payment`, time: p.createdAt.toISOString() })),
      ...signups.map((u) => ({ id: u.id, type: "signup", label: getName(u), sub: "Signed up", time: u.createdAt.toISOString() })),
      ...feedback.map((f) => ({ id: f.id, type: "feedback", label: getName(f.user), sub: f.subject || "Opened a ticket", time: f.createdAt.toISOString() })),
      ...sessions.map((s) => ({ id: s.id, type: "session", label: getName(s.user), sub: "Started study session", time: s.startedAt.toISOString() })),
    ].sort((a, b) => b.time.localeCompare(a.time)).slice(0, 12);

    // ── Conversion rate ────────────────────────────────────────────────────
    const todaySignups = signupsByDay[signupsByDay.length - 1]?.count ?? 0;
    const conversionRate = totalVisitors > 0 ? Math.round((todaySignups / totalVisitors) * 1000) / 10 : 0;

    return NextResponse.json({
      revenueByDay, studyHoursByDay, signupsByDay, popularSlots, feed,
      totalPlatformStudyHours: totalStudyResult._sum.totalStudyHours ?? 0,
      todayRevenue: todayRevenue._sum.amount ?? 0,
      newStudentsThisWeek,
      activeSessionsNow,
      pendingFeedback,
      totalTransactions,
      conversionRate,
      totalVisitors,
    });
  } catch (e) {
    console.error("GET /api/admin/analytics:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
