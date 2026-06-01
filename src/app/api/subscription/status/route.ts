import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    let userId = (session?.user as { id?: string })?.id;

    // Fallback: look up by email if id is missing (mirrors api-helpers.ts behaviour)
    if (!userId && session?.user?.email) {
      const dbUser = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
      });
      if (dbUser) userId = dbUser.id;
    }

    if (!userId) return NextResponse.json({ active: false });

    const now = new Date();
    const sub = await prisma.userSubscription.findFirst({
      where: { userId, status: "ACTIVE", endDate: { gt: now } },
      orderBy: { endDate: "desc" },
      select: { id: true, planType: true, startDate: true, endDate: true, status: true, amountPaid: true },
    });

    const userMeta = await prisma.user.findUnique({
      where: { id: userId },
      select: { trialUsed: true },
    });

    if (!sub) return NextResponse.json({ active: false, trialUsed: userMeta?.trialUsed ?? false });

    return NextResponse.json({
      active: true,
      planType: sub.planType,
      isTrial: sub.planType === "TRIAL",
      startDate: sub.startDate,
      endDate: sub.endDate,
      amountPaid: sub.amountPaid,
      trialUsed: userMeta?.trialUsed ?? false,
    });
  } catch (e) {
    console.error("GET /api/subscription/status:", e);
    return NextResponse.json({ active: false }, { status: 500 });
  }
}
