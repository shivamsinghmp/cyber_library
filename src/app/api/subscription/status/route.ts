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

    if (!sub) return NextResponse.json({ active: false });

    return NextResponse.json({
      active: true,
      planType: sub.planType,
      startDate: sub.startDate,
      endDate: sub.endDate,
      amountPaid: sub.amountPaid,
    });
  } catch {
    return NextResponse.json({ active: false });
  }
}
