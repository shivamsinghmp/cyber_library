import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-helpers";

function toIST(date: Date): string {
  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

/**
 * GET /api/admin/coins/student/[studentId]/summary
 * Full wallet overview + source breakdown + monthly trend — admin only.
 */
export async function GET(
  _request: Request,
  { params }: { params: { studentId: string } },
) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const userId = params.studentId;
    if (!userId) return NextResponse.json({ error: "Missing studentId" }, { status: 400 });

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const [student, earnAgg, spendAgg, lastTxn, categoryBreakdown, adminOps, monthlyRaw] = await Promise.all([
      prisma.user.findUnique({
        where:  { id: userId },
        select: {
          name:      true,
          email:     true,
          studentId: true,
          profile:   { select: { fullName: true, coinBalance: true, createdAt: true } },
        },
      }),

      prisma.studyCoinLog.aggregate({
        where:  { userId, coins: { gt: 0 } },
        _sum:   { coins: true },
        _count: { id: true },
        _max:   { coins: true },
      }),

      prisma.studyCoinLog.aggregate({
        where:  { userId, coins: { lt: 0 } },
        _sum:   { coins: true },
        _count: { id: true },
        _min:   { coins: true },
      }),

      prisma.studyCoinLog.findFirst({
        where:   { userId },
        orderBy: { createdAt: "desc" },
        select:  { createdAt: true, sourceLabel: true, coins: true },
      }),

      prisma.studyCoinLog.groupBy({
        by:     ["sourceCategory"],
        where:  { userId },
        _sum:   { coins: true },
        _count: { id: true },
        _max:   { createdAt: true },
        orderBy: { _sum: { coins: "desc" } },
      }),

      // Admin operations on this account
      prisma.studyCoinLog.findMany({
        where:   { userId, adminId: { not: null } },
        orderBy: { createdAt: "desc" },
        take:    20,
        select:  { coins: true, adminName: true, adminReason: true, sourceCategory: true, createdAt: true, txnId: true },
      }),

      // Raw rows for monthly trend
      prisma.studyCoinLog.findMany({
        where:   { userId, createdAt: { gte: sixMonthsAgo } },
        select:  { coins: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    // Build monthly trend
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

    return NextResponse.json({
      student: {
        id:        userId,
        name:      student.profile?.fullName ?? student.name ?? "—",
        email:     student.email,
        studentId: student.studentId,
        balance:   student.profile?.coinBalance ?? 0,
        memberSince: student.profile?.createdAt ? toIST(student.profile.createdAt) : null,
      },
      wallet: {
        balance:      student.profile?.coinBalance ?? 0,
        earnTotal:    earnAgg._sum.coins ?? 0,
        spendTotal:   Math.abs(spendAgg._sum.coins ?? 0),
        totalTxns:    (earnAgg._count.id ?? 0) + (spendAgg._count.id ?? 0),
        totalCredits: earnAgg._count.id ?? 0,
        totalDebits:  spendAgg._count.id ?? 0,
        maxSingleEarn: earnAgg._max.coins ?? 0,
        maxSingleSpend: Math.abs(spendAgg._min.coins ?? 0),
        lastTxnAt:    lastTxn?.createdAt ?? null,
        lastTxnAtIST: lastTxn ? toIST(lastTxn.createdAt) : null,
        lastTxnLabel: lastTxn?.sourceLabel ?? null,
      },
      // Source breakdown for pie/bar chart
      byCategory: categoryBreakdown.map(r => ({
        sourceCategory: r.sourceCategory ?? "unknown",
        totalCoins:     r._sum.coins ?? 0,
        txnCount:       r._count.id,
        lastTxnAt:      r._max.createdAt,
        type:           (r._sum.coins ?? 0) >= 0 ? "credit" : "debit",
      })),
      // Last 20 admin operations on this account
      adminHistory: adminOps.map(o => ({
        txnId:          o.txnId,
        coins:          o.coins,
        sourceCategory: o.sourceCategory,
        adminName:      o.adminName,
        adminReason:    o.adminReason,
        createdAt:      o.createdAt,
        createdAtIST:   toIST(o.createdAt),
      })),
      // 6-month monthly trend
      monthlyTrend,
    });
  } catch (e) {
    console.error("GET /api/admin/coins/student/[studentId]/summary:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
