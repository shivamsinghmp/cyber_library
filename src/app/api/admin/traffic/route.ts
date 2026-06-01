import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

// ── DB-level helpers (no unbounded JS-side aggregation) ───────────────────────

type DayRow = { date: Date | string; visits: bigint; uniqueIps: bigint };

/** Day-by-day graph using PostgreSQL DATE cast — never loads raw rows into JS */
async function getDayGraph(from: Date, to: Date) {
  const rows = await prisma.$queryRaw<DayRow[]>`
    SELECT
      "createdAt"::date          AS date,
      COUNT(*)                   AS visits,
      COUNT(DISTINCT ip)         AS "uniqueIps"
    FROM   "TrafficVisit"
    WHERE  "createdAt" >= ${from}
      AND  "createdAt" <= ${to}
    GROUP  BY "createdAt"::date
    ORDER  BY "createdAt"::date
  `;
  return rows.map((r) => ({
    date: (r.date instanceof Date ? r.date : new Date(String(r.date)))
      .toISOString()
      .slice(0, 10),
    visits:    Number(r.visits),
    uniqueIps: Number(r.uniqueIps),
  }));
}

async function getTopCountries(from: Date, to: Date) {
  const rows = await prisma.trafficVisit.groupBy({
    by: ["country"],
    where: { createdAt: { gte: from, lte: to }, country: { not: null } },
    _count: { country: true },
    orderBy: { _count: { country: "desc" } },
    take: 10,
  });
  return rows
    .filter((r) => r.country)
    .map((r) => ({ country: r.country as string, visits: r._count.country }));
}

async function getTopReferrers(from: Date, to: Date) {
  const rows = await prisma.trafficVisit.groupBy({
    by: ["referrer"],
    where: { createdAt: { gte: from, lte: to }, referrer: { not: null } },
    _count: { referrer: true },
    orderBy: { _count: { referrer: "desc" } },
    take: 10,
  });
  return rows
    .filter((r) => r.referrer)
    .map((r) => ({ referrer: r.referrer as string, visits: r._count.referrer }));
}

async function getTopPages(from: Date, to: Date) {
  const rows = await prisma.trafficVisit.groupBy({
    by: ["path"],
    where: { createdAt: { gte: from, lte: to }, path: { not: null } },
    _count: { path: true },
    orderBy: { _count: { path: "desc" } },
    take: 10,
  });
  return rows
    .filter((r) => r.path)
    .map((r) => ({ page: r.path as string, visits: r._count.path }));
}

async function getTopUtm(from: Date, to: Date) {
  const rows = await prisma.trafficVisit.groupBy({
    by: ["utmSource"],
    where: { createdAt: { gte: from, lte: to }, utmSource: { not: null } },
    _count: { utmSource: true },
    orderBy: { _count: { utmSource: "desc" } },
    take: 10,
  });
  return rows
    .filter((r) => r.utmSource)
    .map((r) => ({ source: r.utmSource as string, visits: r._count.utmSource }));
}

// ── handler ───────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  try {
    // Allow both ADMIN and EMPLOYEE to view traffic analytics
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get("from"); // YYYY-MM-DD
    const toParam   = searchParams.get("to");   // YYYY-MM-DD

    const now        = new Date();
    const fiveMinAgo = new Date(now.getTime() - 5  * 60 * 1000);
    const sevenAgo   = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000);
    const thirtyAgo  = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // All base queries run in parallel — DB-level aggregation, no unbounded JS loops
    const [
      activeResult,
      last7Days,
      last30Days,
      graphByDay,
      tCountries,
      tReferrers,
      tPages,
      tUtm,
    ] = await Promise.all([
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(DISTINCT ip) AS count
        FROM   "TrafficVisit"
        WHERE  "createdAt" >= ${fiveMinAgo}
      `,
      prisma.trafficVisit.count({ where: { createdAt: { gte: sevenAgo } } }),
      prisma.trafficVisit.count({ where: { createdAt: { gte: thirtyAgo } } }),
      getDayGraph(thirtyAgo, now),
      getTopCountries(thirtyAgo, now),
      getTopReferrers(thirtyAgo, now),
      getTopPages(thirtyAgo, now),
      getTopUtm(thirtyAgo, now),
    ]);

    const activeNow = Number(activeResult[0]?.count ?? 0);

    const base = {
      activeNow,
      last7Days,
      last30Days,
      graphByDay,
      topCountries:  tCountries,
      topReferrers:  tReferrers,
      topPages:      tPages,
      topUtmSources: tUtm,
    };

    // Date-range mode: return range-specific aggregations + individual visits
    if (fromParam && toParam) {
      const rangeFrom = new Date(`${fromParam}T00:00:00.000Z`);
      const rangeTo   = new Date(`${toParam}T23:59:59.999Z`);

      if (isNaN(rangeFrom.getTime()) || isNaN(rangeTo.getTime()))
        return NextResponse.json({ error: "Invalid date format — use YYYY-MM-DD." }, { status: 400 });
      if (rangeFrom > rangeTo)
        return NextResponse.json({ error: "from must be before to." }, { status: 400 });

      const [rangeGraph, rangeCountries, rangeReferrers, rangePages, rangeUtm, visits] =
        await Promise.all([
          getDayGraph(rangeFrom, rangeTo),
          getTopCountries(rangeFrom, rangeTo),
          getTopReferrers(rangeFrom, rangeTo),
          getTopPages(rangeFrom, rangeTo),
          getTopUtm(rangeFrom, rangeTo),
          prisma.trafficVisit.findMany({
            where:   { createdAt: { gte: rangeFrom, lte: rangeTo } },
            orderBy: { createdAt: "desc" },
            take:    2000,
            select: {
              id: true, ip: true, deviceType: true, path: true,
              country: true, city: true, referrer: true,
              utmSource: true, utmMedium: true, utmCampaign: true,
              createdAt: true,
            },
          }),
        ]);

      return NextResponse.json({
        ...base,
        from: fromParam,
        to:   toParam,
        rangeGraphByDay:    rangeGraph,
        rangeTopCountries:  rangeCountries,
        rangeTopReferrers:  rangeReferrers,
        rangeTopPages:      rangePages,
        rangeTopUtmSources: rangeUtm,
        visits: visits.map((v) => ({ ...v, createdAt: v.createdAt.toISOString() })),
      });
    }

    return NextResponse.json(base);
  } catch (e) {
    console.error("GET /api/admin/traffic:", e);
    return NextResponse.json({ error: "Failed to load traffic data" }, { status: 500 });
  }
}
