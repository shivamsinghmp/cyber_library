import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logTrialEvent, getTrialDays } from "@/lib/trial-logger";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await auth();
    const userId  = (session?.user as { id?: string })?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip        = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;
    const userAgent = request.headers.get("user-agent") ?? undefined;

    const user = await prisma.user.findUnique({
      where:  { id: userId },
      select: { trialUsed: true, email: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.trialUsed) {
      // Log blocked retrial attempt
      logTrialEvent({ userId, event: "retrial_blocked", detail: "Trial already used", ipAddress: ip, userAgent });
      return NextResponse.json(
        { error: "Free trial already used. Please upgrade to continue." },
        { status: 409 }
      );
    }

    // Check no active subscription already
    const existingSub = await prisma.userSubscription.findFirst({
      where:  { userId, status: "ACTIVE", endDate: { gt: new Date() } },
      select: { id: true },
    });
    if (existingSub) {
      return NextResponse.json(
        { error: "Aapka subscription already active hai." },
        { status: 409 }
      );
    }

    const trialDays = await getTrialDays();
    const now       = new Date();
    const endDate   = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);

    await prisma.$transaction([
      prisma.userSubscription.create({
        data: { userId, planType: "TRIAL", startDate: now, endDate, status: "ACTIVE", amountPaid: 0 },
      }),
      prisma.user.update({
        where: { id: userId },
        data:  { trialUsed: true },
      }),
    ]);

    logTrialEvent({
      userId,
      event:    "enrolled",
      detail:   `Trial started. Duration: ${trialDays} days. Expires: ${endDate.toISOString()}`,
      ipAddress: ip,
      userAgent,
    });

    return NextResponse.json({ success: true, endDate: endDate.toISOString(), trialDays });
  } catch (e) {
    console.error("POST /api/trial/activate:", e);
    return NextResponse.json({ error: "Failed to activate trial" }, { status: 500 });
  }
}
