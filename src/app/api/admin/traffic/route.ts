import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/api-helpers";

function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function buildBreakdowns(visits: { ip: string; country: string | null; referrer: string | null; path: string | null; utmSource: string | null; utmMedium: string | null; utmCampaign: string | null; createdAt: Date }[]) {
  const byDay = new Map<string, { visits: number; ips: Set<string> }>();
  const countryMap = new Map<string, number>();
  const referrerMap = new Map<string, number>();
  const pageMap = new Map<string, number>();
  const utmSourceMap = new Map<string, number>();

  for (const v of visits) {
    const day = toDateOnly(new Date(v.createdAt));
    if (!byDay.has(day)) byDay.set(day, { visits: 0, ips: new Set() });
    const entry = byDay.get(day)!;
    entry.visits++;
    entry.ips.add(v.ip);

    if (v.country) countryMap.set(v.country, (countryMap.get(v.country) ?? 0) + 1);

    const ref = v.referrer ?? "(direct)";
    referrerMap.set(ref, (referrerMap.get(ref) ?? 0) + 1);

    if (v.path) pageMap.set(v.path, (pageMap.get(v.path) ?? 0) + 1);

    const src = v.utmSource ?? "(none)";
    utmSourceMap.set(src, (utmSourceMap.get(src) ?? 0) + 1);
  }

  return {
    graphByDay: Array.from(byDay.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, d]) => ({ date, visits: d.visits, uniqueIps: d.ips.size })),
    topCountries: Array.from(countryMap.entries())
      .sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([country, visits]) => ({ country, visits })),
    topReferrers: Array.from(referrerMap.entries())
      .sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([referrer, visits]) => ({ referrer, visits })),
    topPages: Array.from(pageMap.entries())
      .sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([page, visits]) => ({ page, visits })),
    topUtmSources: Array.from(utmSourceMap.entries())
      .filter(([k]) => k !== "(none)")
      .sort((a, b) => b[1] - a[1]).slice(0, 10)
      .map(([source, visits]) => ({ source, visits })),
  };
}

/** GET: Traffic stats. Without params → last-30-day summary + breakdowns. With from+to → detailed visit list. */
export async function GET(request: Request) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;

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

    const [activeVisits, weekCount, monthCount, defaultVisits] = await Promise.all([
      prisma.trafficVisit.findMany({ where: { createdAt: { gte: fiveMinAgo } }, select: { ip: true } }),
      prisma.trafficVisit.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.trafficVisit.count({ where: { createdAt: { gte: monthAgo } } }),
      prisma.trafficVisit.findMany({
        where: { createdAt: { gte: monthAgo } },
        orderBy: { createdAt: "asc" },
        select: { ip: true, country: true, referrer: true, path: true, utmSource: true, utmMedium: true, utmCampaign: true, createdAt: true },
      }),
    ]);

    const activeUniqueIps = new Set(activeVisits.map((v) => v.ip)).size;
    const defaultBreakdowns = buildBreakdowns(defaultVisits);

    const result: {
      activeNow: number;
      last7Days: number;
      last30Days: number;
      graphByDay: { date: string; visits: number; uniqueIps: number }[];
      topCountries: { country: string; visits: number }[];
      topReferrers: { referrer: string; visits: number }[];
      topPages: { page: string; visits: number }[];
      topUtmSources: { source: string; visits: number }[];
      from?: string;
      to?: string;
      visits?: { id: string; ip: string; deviceType: string; path: string | null; country: string | null; city: string | null; referrer: string | null; utmSource: string | null; utmMedium: string | null; utmCampaign: string | null; createdAt: string }[];
      rangeGraphByDay?: { date: string; visits: number; uniqueIps: number }[];
      rangeTopCountries?: { country: string; visits: number }[];
      rangeTopReferrers?: { referrer: string; visits: number }[];
      rangeTopPages?: { page: string; visits: number }[];
      rangeTopUtmSources?: { source: string; visits: number }[];
    } = {
      activeNow: activeUniqueIps,
      last7Days: weekCount,
      last30Days: monthCount,
      ...defaultBreakdowns,
    };

    if (fromParam && toParam) {
      const from = new Date(fromParam);
      const to = new Date(toParam);
      if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()))
        return NextResponse.json({ error: "Invalid from or to date" }, { status: 400 });
      from.setHours(0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);
      if (from > to)
        return NextResponse.json({ error: "from must be before to" }, { status: 400 });

      const rangeVisits = await prisma.trafficVisit.findMany({
        where: { createdAt: { gte: from, lte: to } },
        orderBy: { createdAt: "desc" },
        take: 2000,
        select: { id: true, ip: true, deviceType: true, path: true, country: true, city: true, referrer: true, utmSource: true, utmMedium: true, utmCampaign: true, createdAt: true },
      });

      const rb = buildBreakdowns(
        rangeVisits.map((v) => ({ ip: v.ip, country: v.country, referrer: v.referrer, path: v.path, utmSource: v.utmSource, utmMedium: v.utmMedium, utmCampaign: v.utmCampaign, createdAt: v.createdAt }))
      );

      result.from = fromParam;
      result.to = toParam;
      result.visits = rangeVisits.map((v) => ({
        id: v.id, ip: v.ip, deviceType: v.deviceType, path: v.path,
        country: v.country, city: v.city, referrer: v.referrer,
        utmSource: v.utmSource, utmMedium: v.utmMedium, utmCampaign: v.utmCampaign,
        createdAt: v.createdAt.toISOString(),
      }));
      result.rangeGraphByDay = rb.graphByDay;
      result.rangeTopCountries = rb.topCountries;
      result.rangeTopReferrers = rb.topReferrers;
      result.rangeTopPages = rb.topPages;
      result.rangeTopUtmSources = rb.topUtmSources;
    }

    return NextResponse.json(result);
  } catch (e) {
    console.error("GET /api/admin/traffic:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
