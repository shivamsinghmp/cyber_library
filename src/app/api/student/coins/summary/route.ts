import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

function toIST(date: Date): string {
  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

/**
 * GET /api/student/coins/summary
 * Wallet overview + source-wise breakdown + 6-month monthly trend
 * for the logged-in student.
 */
export async function GET() {
  try {
    const session = await auth();
    const userId = (session?.user as { id?: string })?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const [profile, earnAgg, spendAgg, lastTxn, categoryBreakdown, monthlyRaw] = await Promise.all([
      // Current balance
      prisma.profile.findUnique({
        where:  { userId },
        select: { coinBalance: true, fullName: true },
      }),

      // Total earned (all time)
      prisma.studyCoinLog.aggregate({
        where:  { userId, coins: { gt: 0 } },
        _sum:   { coins: true },
        _count: { id: true },
      }),

      // Total spent (all time)
      prisma.studyCoinLog.aggregate({
        where:  { userId, coins: { lt: 0 } },
        _sum:   { coins: true },
        _count: { id: true },
      }),

      // Last transaction timestamp
      prisma.studyCoinLog.findFirst({
        where:   { userId },
        orderBy: { createdAt: "desc" },
        select:  { createdAt: true },
      }),

      // Source-wise breakdown (grouped)
      prisma.studyCoinLog.groupBy({
        by:    ["sourceCategory"],
        where: { userId },
        _sum:  { coins: true },
        _count: { id: true },
        orderBy: { _sum: { coins: "desc" } },
      }),

      // Raw data for monthly trend (last 6 months)
      prisma.studyCoinLog.findMany({
        where:   { userId, createdAt: { gte: sixMonthsAgo } },
        select:  { coins: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    // Build month-by-month trend from raw rows (avoids raw SQL)
    const monthMap = new Map<string, { label: string; date: string; earned: number; spent: number; txns: number }>();
    for (const row of monthlyRaw) {
      const dt   = new Date(row.createdAt);
      const key  = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
      const label = dt.toLocaleString("en-IN", { month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
      if (!monthMap.has(key)) monthMap.set(key, { label, date: key, earned: 0, spent: 0, txns: 0 });
      const entry = monthMap.get(key)!;
      if (row.coins > 0)  entry.earned += row.coins;
      else                entry.spent  += Math.abs(row.coins);
      entry.txns++;
    }
    const monthlyTrend = Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);

    // This-month totals
    const nowIST    = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const monthStart = new Date(nowIST.getFullYear(), nowIST.getMonth(), 1);
    const thisMonthKey = `${nowIST.getFullYear()}-${String(nowIST.getMonth() + 1).padStart(2, "0")}`;
    const thisMonth = monthMap.get(thisMonthKey) ?? { earned: 0, spent: 0, txns: 0 };

    void monthStart; // used via monthlyRaw filter

    return NextResponse.json({
      balance:        profile?.coinBalance ?? 0,
      earnTotal:      earnAgg._sum.coins ?? 0,
      spendTotal:     Math.abs(spendAgg._sum.coins ?? 0),
      totalTxns:      (earnAgg._count.id ?? 0) + (spendAgg._count.id ?? 0),
      totalCredits:   earnAgg._count.id ?? 0,
      totalDebits:    spendAgg._count.id ?? 0,
      lastTxnAt:      lastTxn?.createdAt ?? null,
      lastTxnAtIST:   lastTxn ? toIST(lastTxn.createdAt) : null,
      thisMonth: {
        earned: thisMonth.earned,
        spent:  thisMonth.spent,
        txns:   thisMonth.txns,
      },
      // Source-wise breakdown for pie chart
      byCategory: categoryBreakdown.map(r => ({
        sourceCategory: r.sourceCategory ?? "unknown",
        totalCoins:     r._sum.coins ?? 0,
        txnCount:       r._count.id,
        type:           (r._sum.coins ?? 0) > 0 ? "credit" : "debit",
      })),
      // 6-month trend for bar/line chart
      monthlyTrend,
    });
  } catch (e) {
    console.error("GET /api/student/coins/summary:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
