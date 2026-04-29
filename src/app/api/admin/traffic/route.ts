import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/api-helpers";

function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** GET: Traffic stats. Query: from, to (YYYY-MM-DD) for date range; else returns summary only. */
export async function GET(request: Request) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    const { user } = auth;

    const now = new Date();
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);
    const monthAgo = new Date(now);
    monthAgo.setDate(monthAgo.getDate() - 30);
    monthAgo.setHours(0, 0, 0, 0);

    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    const activeVisits = await prisma.trafficVisit.findMany({
      where: { createdAt: { gte: fiveMinAgo } },
      select: { ip: true },
    });
    const activeUniqueIps = new Set(activeVisits.map((v) => v.ip)).size;

    const [weekCount, monthCount] = await Promise.all([
      prisma.trafficVisit.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.trafficVisit.count({ where: { createdAt: { gte: monthAgo } } }),
    ]);

    const result: {
      activeNow: number;
      last7Days: number;
      last30Days: number;
      from?: string;
      to?: string;
      visits?: { id: string; ip: string; deviceType: string; path: string | null; createdAt: string }[];
      graphByDay?: { date: string; visits: number; uniqueIps: number }[];
    } = {
      activeNow: activeUniqueIps,
      last7Days: weekCount,
      last30Days: monthCount,
    };

    if (fromParam && toParam) {
      const from = new Date(fromParam);
      const to = new Date(toParam);
      if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
        return NextResponse.json({ error: "Invalid from or to date" }, { status: 400 });
      }
      from.setHours(0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);
      if (from > to) {
        return NextResponse.json({ error: "from must be before to" }, { status: 400 });
      }

      const visits = await prisma.trafficVisit.findMany({
        where: { createdAt: { gte: from, lte: to } },
        orderBy: { createdAt: "desc" },
        take: 2000,
        select: { id: true, ip: true, deviceType: true, path: true, createdAt: true },
      });

      const byDay = new Map<string, { visits: number; ips: Set<string> }>();
      for (const v of visits) {
        const day = toDateOnly(new Date(v.createdAt));
        if (!byDay.has(day)) byDay.set(day, { visits: 0, ips: new Set() });
        const entry = byDay.get(day)!;
        entry.visits++;
        entry.ips.add(v.ip);
      }
      const graphByDay = Array.from(byDay.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, d]) => ({ date, visits: d.visits, uniqueIps: d.ips.size }));

      result.from = fromParam;
      result.to = toParam;
      result.visits = visits.map((v) => ({
        id: v.id,
        ip: v.ip,
        deviceType: v.deviceType,
        path: v.path,
        createdAt: v.createdAt.toISOString(),
      }));
      result.graphByDay = graphByDay;
    }

    return NextResponse.json(result);
  } catch (e) {
    console.error("GET /api/admin/traffic:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
