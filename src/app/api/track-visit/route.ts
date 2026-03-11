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

/** GET: Record a page visit (IP, User-Agent, path from query). Call from client on page load. */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path") ?? "/";
    const ip = getClientIp(request);
    const userAgent = request.headers.get("user-agent") ?? null;
    const deviceType = getDeviceType(userAgent);

    await prisma.trafficVisit.create({
      data: { ip, userAgent, deviceType, path: path.slice(0, 500) },
    });

    return new NextResponse(null, { status: 204 });
  } catch (e) {
    console.error("GET /api/track-visit:", e);
    return new NextResponse(null, { status: 200 });
  }
}
