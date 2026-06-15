import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const masked = local.slice(0, 2) + "***";
  return `${masked}@${domain}`;
}

export async function GET() {
  try {
    const session = await auth();
    const userId = (session?.user as { id?: string })?.id;
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (user?.role !== "INFLUENCER")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const clicks = await prisma.influencerLinkClick.findMany({
      where: { influencerId: userId, userId: { not: null } },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
            trialUsed: true,
            userSubscriptions: {
              where: { status: "ACTIVE" },
              select: { planType: true, startDate: true },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const result = clicks
      .filter((c) => c.user != null)
      .map((c) => ({
        clickId: c.id,
        joinedAt: c.user!.createdAt,
        convertedAt: c.convertedAt,
        name: c.user!.name ?? "—",
        email: maskEmail(c.user!.email),
        trialUsed: c.user!.trialUsed,
        activePlan: c.user!.userSubscriptions[0]?.planType ?? null,
        planStartDate: c.user!.userSubscriptions[0]?.startDate ?? null,
      }));

    return NextResponse.json(result);
  } catch (e) {
    console.error("referred-users:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
