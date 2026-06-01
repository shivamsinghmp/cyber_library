import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-helpers";

/** GET /api/admin/coin-engine/overview — Platform-level coin statistics */
export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      circulationAgg,
      studentsWithCoins,
      issuedAgg,
      spentAgg,
      todayCreditAgg,
      todayDebitAgg,
      last30Logs,
    ] = await Promise.all([
      prisma.profile.aggregate({ _sum: { coinBalance: true } }),
      prisma.profile.count({ where: { coinBalance: { gt: 0 } } }),
      prisma.studyCoinLog.aggregate({ where: { coins: { gt: 0 } }, _sum: { coins: true } }),
      prisma.studyCoinLog.aggregate({ where: { coins: { lt: 0 } }, _sum: { coins: true } }),
      prisma.studyCoinLog.aggregate({
        where: { coins: { gt: 0 }, createdAt: { gte: today } },
        _sum: { coins: true },
      }),
      prisma.studyCoinLog.aggregate({
        where: { coins: { lt: 0 }, createdAt: { gte: today } },
        _sum: { coins: true },
      }),
      prisma.studyCoinLog.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { coins: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    // Aggregate by day for 30-day bar chart
    const dailyMap: Record<string, { credits: number; debits: number }> = {};
    for (const log of last30Logs) {
      const day = log.createdAt.toISOString().slice(0, 10);
      if (!dailyMap[day]) dailyMap[day] = { credits: 0, debits: 0 };
      if (log.coins > 0) dailyMap[day].credits += log.coins;
      else dailyMap[day].debits += Math.abs(log.coins);
    }

    return NextResponse.json({
      totalInCirculation: circulationAgg._sum.coinBalance ?? 0,
      studentsWithCoins,
      totalIssued: issuedAgg._sum.coins ?? 0,
      totalSpent:  Math.abs(spentAgg._sum.coins ?? 0),
      todayCredits: todayCreditAgg._sum.coins ?? 0,
      todayDebits:  Math.abs(todayDebitAgg._sum.coins ?? 0),
      last30Days: Object.entries(dailyMap).map(([date, v]) => ({ date, ...v })),
    });
  } catch (e) {
    console.error("GET /api/admin/coin-engine/overview:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
