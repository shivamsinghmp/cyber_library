import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDeviceType } from "@/lib/deviceType";

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  if (forwarded) return forwarded.split(",")[0].trim();
  if (realIp) return realIp;
  return "unknown";
}

/** GET: Record a page visit. Fire-and-forget — never blocks page load. */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path") ?? "/";
    const ip = getClientIp(request);
    const userAgent = request.headers.get("user-agent") ?? null;
    const deviceType = getDeviceType(userAgent);

    // Fire-and-forget: don't await — return 204 immediately, DB write happens async
    prisma.trafficVisit
      .create({ data: { ip, userAgent, deviceType, path: path.slice(0, 500) } })
      .catch((e) => console.error("track-visit write failed:", e));

    return new NextResponse(null, { status: 204 });
  } catch {
    return new NextResponse(null, { status: 200 });
  }
}
