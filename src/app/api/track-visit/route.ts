import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDeviceType } from "@/lib/deviceType";

export const dynamic = "force-dynamic";

type VisitRow = {
  ip: string;
  userAgent: string | null;
  deviceType: string;
  path: string;
  country: string | null;
  city: string | null;
  referrer: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
};

// Worker-local in-memory queue — batches DB writes across requests.
const visitQueue: VisitRow[] = [];
const FLUSH_EVERY_MS = 30_000;
const EAGER_FLUSH_AT = 50;
// Purge rows older than 90 days once per day per worker (DPDP Act retention policy)
const RETENTION_DAYS = 90;
let lastRetentionPurge = 0;

async function flushVisitQueue() {
  if (visitQueue.length === 0) return;
  const batch = visitQueue.splice(0, 100);
  prisma.trafficVisit
    .createMany({ data: batch, skipDuplicates: true })
    .catch((e) => console.error("track-visit flush failed:", e));

  // Purge old rows once every 24 h (one worker wins the race — others skip)
  const now = Date.now();
  if (now - lastRetentionPurge > 24 * 60 * 60 * 1000) {
    lastRetentionPurge = now;
    const cutoff = new Date(now - RETENTION_DAYS * 24 * 60 * 60 * 1000);
    prisma.trafficVisit
      .deleteMany({ where: { createdAt: { lt: cutoff } } })
      .catch((e) => console.error("track-visit retention purge failed:", e));
  }
}

if (typeof setInterval !== "undefined") {
  setInterval(flushVisitQueue, FLUSH_EVERY_MS);
}

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  if (forwarded) return forwarded.split(",")[0].trim();
  if (realIp) return realIp;
  return "unknown";
}

// Anonymize IP for DPDP Act 2023 compliance — keeps geo-lookup accuracy but
// removes the identifying last octet so stored IPs cannot be traced to individuals.
function anonymizeIp(ip: string): string {
  // IPv4: zero the last octet (203.0.113.42 → 203.0.113.0)
  const v4 = ip.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3})\.\d{1,3}$/);
  if (v4) return `${v4[1]}.0`;
  // IPv6: zero the last 80 bits (keep first 48 bits for rough geo, per RFC 6973)
  if (ip.includes(":")) {
    const parts = ip.split(":");
    if (parts.length >= 3) return `${parts[0]}:${parts[1]}:${parts[2]}::`;
  }
  return "0.0.0.0";
}

function parseReferrer(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const host = new URL(raw).hostname.replace(/^www\./, "");
    return host || null;
  } catch {
    return null;
  }
}

/** GET: Record a page visit. Returns 204 immediately; DB write is batched. */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path") ?? "/";
    const rawIp = getClientIp(request);
    const ip = anonymizeIp(rawIp);
    const userAgent = request.headers.get("user-agent") ?? null;
    const deviceType = getDeviceType(userAgent);
    const referrer = parseReferrer(request.headers.get("referer"));
    const utmSource = searchParams.get("utm_source")?.slice(0, 100) ?? null;
    const utmMedium = searchParams.get("utm_medium")?.slice(0, 100) ?? null;
    const utmCampaign = searchParams.get("utm_campaign")?.slice(0, 100) ?? null;

    // Geo lookup on raw IP (needs full IP for accuracy), then discard raw IP
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const geoip = require("geoip-lite") as typeof import("geoip-lite");
    const geo = rawIp !== "unknown" ? geoip.lookup(rawIp) : null;

    visitQueue.push({
      ip,                         // anonymized — stored in DB
      userAgent,
      deviceType,
      path: path.slice(0, 500),
      country: geo?.country ?? null,
      city: geo?.city ?? null,
      referrer,
      utmSource,
      utmMedium,
      utmCampaign,
    });

    if (visitQueue.length >= EAGER_FLUSH_AT) {
      flushVisitQueue();
    }

    return new NextResponse(null, { status: 204 });
  } catch {
    return new NextResponse(null, { status: 200 });
  }
}
