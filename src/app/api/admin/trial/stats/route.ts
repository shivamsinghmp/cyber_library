import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-helpers";

/** GET /api/admin/trial/stats — Aggregated trial stats for the admin dashboard */
export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const now       = new Date();
    const in3Days   = new Date(now.getTime() + 3 * 86_400_000);

    const [
      totalEnrolled,
      activeCount,
      expiredCount,
      convertedCount,
      expiringSoon,
      retrialBlockedToday,
      newThisWeek,
    ] = await Promise.all([
      // Users who ever activated a trial
      prisma.user.count({ where: { trialUsed: true } }),
      // Currently active trials
      prisma.userSubscription.count({
        where: { planType: "TRIAL", status: "ACTIVE", endDate: { gt: now } },
      }),
      // Expired trials
      prisma.userSubscription.count({
        where: { planType: "TRIAL", status: "EXPIRED" },
      }),
      // Users who converted (trial + have paid subscription)
      prisma.user.count({
        where: {
          trialUsed: true,
          userSubscriptions: {
            some: { planType: { in: ["MONTHLY", "YEARLY"] }, status: "ACTIVE" },
          },
        },
      }),
      // Expiring in next 3 days
      prisma.userSubscription.findMany({
        where: {
          planType: "TRIAL",
          status:   "ACTIVE",
          endDate:  { gt: now, lte: in3Days },
        },
        include: {
          user: {
            select: {
              id: true, name: true, studentId: true,
              profile: { select: { phone: true, whatsappNumber: true } },
            },
          },
        },
        orderBy: { endDate: "asc" },
      }),
      // Retrial blocked events today
      prisma.trialLog.count({
        where: {
          event:     "retrial_blocked",
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      // New trial enrollments this week
      prisma.userSubscription.count({
        where: {
          planType:  "TRIAL",
          startDate: { gte: new Date(now.getTime() - 7 * 86_400_000) },
        },
      }),
    ]);

    const conversionRate = totalEnrolled > 0
      ? parseFloat(((convertedCount / totalEnrolled) * 100).toFixed(1))
      : 0;

    return NextResponse.json({
      totalEnrolled,
      activeCount,
      expiredCount,
      convertedCount,
      conversionRate,
      newThisWeek,
      retrialBlockedToday,
      expiringSoon: expiringSoon.map(s => ({
        userId:     s.user.id,
        name:       s.user.name ?? "—",
        studentId:  s.user.studentId ?? "—",
        phone:      s.user.profile?.whatsappNumber ?? s.user.profile?.phone ?? "—",
        endDate:    s.endDate,
        daysLeft:   Math.ceil((s.endDate.getTime() - now.getTime()) / 86_400_000),
      })),
    });
  } catch (e) {
    console.error("GET /api/admin/trial/stats:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
