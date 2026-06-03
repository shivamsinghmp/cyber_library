import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-helpers";

const COIN_VALUE_INR = 0.50; // 1 coin = ₹0.50

/** GET /api/admin/ai-usage/overview — Platform AI usage stats for the current month */
export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const today      = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [monthAgg, todayAgg, byProvider, byFeature, last30Raw] = await Promise.all([
      // Current-month totals
      prisma.aIUsageLog.aggregate({
        where:  { createdAt: { gte: monthStart }, status: "success" },
        _sum:   { totalTokens: true, costInr: true, coinsCharged: true },
        _count: { id: true },
        _avg:   { latencyMs: true },
      }),
      // Today's totals
      prisma.aIUsageLog.aggregate({
        where:  { createdAt: { gte: today }, status: "success" },
        _sum:   { totalTokens: true, costInr: true, coinsCharged: true },
        _count: { id: true },
      }),
      // By provider
      prisma.aIUsageLog.groupBy({
        by:    ["provider"],
        where: { createdAt: { gte: monthStart }, status: "success" },
        _sum:  { totalTokens: true, costInr: true, coinsCharged: true },
        _count: { id: true },
      }),
      // By feature
      prisma.aIUsageLog.groupBy({
        by:    ["feature"],
        where: { createdAt: { gte: monthStart }, status: "success" },
        _sum:  { totalTokens: true, costInr: true, coinsCharged: true },
        _count: { id: true },
      }),
      // Last 30 days — grouped in-memory (simpler than raw SQL)
      prisma.aIUsageLog.findMany({
        where:  { createdAt: { gte: new Date(now.getTime() - 30 * 86400_000) }, status: "success" },
        select: { createdAt: true, totalTokens: true, costInr: true, coinsCharged: true, provider: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    // Aggregate last-30-days by date for chart
    const dailyMap: Record<string, { tokens: number; costInr: number; calls: number; coinsCharged: number; byProvider: Record<string, number> }> = {};
    for (const log of last30Raw) {
      const day = log.createdAt.toISOString().slice(0, 10);
      if (!dailyMap[day]) dailyMap[day] = { tokens: 0, costInr: 0, calls: 0, coinsCharged: 0, byProvider: {} };
      dailyMap[day].tokens       += log.totalTokens;
      dailyMap[day].costInr      += log.costInr;
      dailyMap[day].calls        += 1;
      dailyMap[day].coinsCharged += log.coinsCharged;
      dailyMap[day].byProvider[log.provider] = (dailyMap[day].byProvider[log.provider] ?? 0) + log.totalTokens;
    }

    const totalCostInr     = monthAgg._sum.costInr      ?? 0;
    const totalCoins       = monthAgg._sum.coinsCharged  ?? 0;
    const totalRevenueInr  = parseFloat((totalCoins * COIN_VALUE_INR).toFixed(2));
    const totalProfitInr   = parseFloat((totalRevenueInr - totalCostInr).toFixed(2));
    const profitMarginPct  = totalRevenueInr > 0
      ? Math.round((totalProfitInr / totalRevenueInr) * 100)
      : 0;

    const todayCoins       = todayAgg._sum.coinsCharged  ?? 0;
    const todayCostInr     = todayAgg._sum.costInr       ?? 0;
    const todayRevenueInr  = parseFloat((todayCoins * COIN_VALUE_INR).toFixed(2));
    const todayProfitInr   = parseFloat((todayRevenueInr - todayCostInr).toFixed(2));

    return NextResponse.json({
      currentMonth: {
        totalCalls:      monthAgg._count.id        ?? 0,
        totalTokens:     monthAgg._sum.totalTokens  ?? 0,
        totalCostInr:    parseFloat(totalCostInr.toFixed(2)),
        avgLatencyMs:    Math.round(monthAgg._avg.latencyMs ?? 0),
        coinsCharged:    totalCoins,
        revenueInr:      totalRevenueInr,
        profitInr:       totalProfitInr,
        profitMarginPct,
      },
      today: {
        calls:       todayAgg._count.id        ?? 0,
        tokens:      todayAgg._sum.totalTokens  ?? 0,
        costInr:     parseFloat(todayCostInr.toFixed(2)),
        coinsCharged: todayCoins,
        revenueInr:  todayRevenueInr,
        profitInr:   todayProfitInr,
      },
      byProvider: byProvider.map(p => {
        const cost    = p._sum.costInr     ?? 0;
        const coins   = p._sum.coinsCharged ?? 0;
        const revenue = parseFloat((coins * COIN_VALUE_INR).toFixed(2));
        const profit  = parseFloat((revenue - cost).toFixed(2));
        return {
          provider: p.provider,
          calls:    p._count.id,
          tokens:   p._sum.totalTokens ?? 0,
          costInr:  parseFloat(cost.toFixed(2)),
          coinsCharged: coins,
          revenueInr:   revenue,
          profitInr:    profit,
          pct: totalCostInr > 0 ? Math.round((cost / totalCostInr) * 100) : 0,
        };
      }).sort((a, b) => b.costInr - a.costInr),
      byFeature: byFeature.map(f => {
        const cost    = f._sum.costInr     ?? 0;
        const coins   = f._sum.coinsCharged ?? 0;
        const revenue = parseFloat((coins * COIN_VALUE_INR).toFixed(2));
        const profit  = parseFloat((revenue - cost).toFixed(2));
        return {
          feature:   f.feature,
          calls:     f._count.id,
          tokens:    f._sum.totalTokens ?? 0,
          costInr:   parseFloat(cost.toFixed(2)),
          coinsCharged: coins,
          revenueInr:   revenue,
          profitInr:    profit,
        };
      }).sort((a, b) => b.revenueInr - a.revenueInr),
      last30Days: Object.entries(dailyMap).map(([date, v]) => ({
        date,
        ...v,
        revenueInr: parseFloat((v.coinsCharged * COIN_VALUE_INR).toFixed(2)),
        profitInr:  parseFloat((v.coinsCharged * COIN_VALUE_INR - v.costInr).toFixed(2)),
      })),
    });
  } catch (e) {
    console.error("GET /api/admin/ai-usage/overview:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
