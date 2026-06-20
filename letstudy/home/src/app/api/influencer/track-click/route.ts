import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  const rl = rateLimit(`inf-click:${ip}`, 10, 60);
  if (!rl.success)
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  try {
    const body = await request.json();
    const { referralCode, visitorId } = body as {
      referralCode?: string;
      visitorId?: string;
    };
    if (!referralCode)
      return NextResponse.json(
        { error: "Missing referralCode" },
        { status: 400 }
      );

    const influencer = await prisma.user.findFirst({
      where: { referralCode, role: "INFLUENCER", deletedAt: null },
      select: { id: true },
    });
    if (!influencer)
      return NextResponse.json(
        { error: "Invalid referral code" },
        { status: 404 }
      );

    await prisma.influencerLinkClick.create({
      data: {
        influencerId: influencer.id,
        visitorIp: ip === "unknown" ? null : ip,
        visitorId: visitorId ?? null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("track-click:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
