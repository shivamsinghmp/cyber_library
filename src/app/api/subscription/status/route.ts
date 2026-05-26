import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    const userId = (session?.user as { id?: string })?.id;
    if (!userId) return NextResponse.json({ active: false });

    const now = new Date();
    const [sub, roomSub] = await Promise.all([
      prisma.userSubscription.findFirst({
        where: { userId, status: "ACTIVE", endDate: { gt: now } },
        orderBy: { endDate: "desc" },
        select: { id: true, planType: true, startDate: true, endDate: true, status: true, amountPaid: true },
      }),
      prisma.roomSubscription.findFirst({
        where: { userId },
        select: { id: true, createdAt: true },
      }),
    ]);

    if (sub) {
      return NextResponse.json({
        active: true,
        planType: sub.planType,
        startDate: sub.startDate,
        endDate: sub.endDate,
        amountPaid: sub.amountPaid,
      });
    }

    // Users enrolled in any study room also get dashboard access
    if (roomSub) {
      return NextResponse.json({ active: true, planType: "ROOM" });
    }

    return NextResponse.json({ active: false });
  } catch {
    return NextResponse.json({ active: false });
  }
}
