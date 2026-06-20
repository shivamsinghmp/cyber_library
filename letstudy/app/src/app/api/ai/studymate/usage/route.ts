import { NextResponse } from "next/server";
import { requireModule } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/ai/studymate/usage
 * Student's own AI usage statistics (today + this month + all-time).
 */
export async function GET() {
  const auth = await requireModule("studymate");
  if (auth.error) return auth.error;
  const userId = auth.user.id;

  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [todayLogs, monthLogs, allTimeLogs, profile, sessionCount] = await Promise.all([
    prisma.aIUsageLog.findMany({
      where:  { userId, createdAt: { gte: todayStart }, status: "success" },
      select: { coinsCharged: true, totalTokens: true, model: true, latencyMs: true },
    }),
    prisma.aIUsageLog.findMany({
      where:  { userId, createdAt: { gte: monthStart }, status: "success" },
      select: { coinsCharged: true, totalTokens: true, model: true, latencyMs: true },
    }),
    prisma.aIUsageLog.findMany({
      where:  { userId, status: "success" },
      select: { coinsCharged: true, totalTokens: true, model: true },
    }),
    prisma.profile.findUnique({
      where:  { userId },
      select: { coinBalance: true, dailyCoinLimit: true },
    }),
    prisma.chatSession.count({ where: { userId } }),
  ]);

  function summarise(logs: { coinsCharged: number; totalTokens: number; model: string; latencyMs?: number }[]) {
    const byModel: Record<string, { calls: number; coins: number; tokens: number }> = {};
    let totalCoins = 0, totalTokens = 0, totalLatency = 0, calls = 0;
    for (const l of logs) {
      totalCoins   += l.coinsCharged;
      totalTokens  += l.totalTokens;
      totalLatency += l.latencyMs ?? 0;
      calls++;
      if (!byModel[l.model]) byModel[l.model] = { calls: 0, coins: 0, tokens: 0 };
      byModel[l.model].calls  += 1;
      byModel[l.model].coins  += l.coinsCharged;
      byModel[l.model].tokens += l.totalTokens;
    }
    return { calls, totalCoins, totalTokens, avgLatencyMs: calls ? Math.round(totalLatency / calls) : 0, byModel };
  }

  const today    = summarise(todayLogs);
  const month    = summarise(monthLogs);
  const allTime  = summarise(allTimeLogs);

  return NextResponse.json({
    today,
    month,
    allTime,
    coinBalance:    profile?.coinBalance    ?? 0,
    dailyCoinLimit: profile?.dailyCoinLimit ?? null,
    totalSessions:  sessionCount,
    todaySpent:     today.totalCoins,
    dailyRemaining: profile?.dailyCoinLimit != null
      ? Math.max(0, profile.dailyCoinLimit - today.totalCoins)
      : null,
  });
}
