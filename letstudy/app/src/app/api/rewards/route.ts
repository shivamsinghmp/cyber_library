import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** GET: List all active rewards. For logged-in user, includes enrollment (win) status. */
export async function GET() {
  try {
    const session = await auth();
    const userId = (session?.user as { id?: string })?.id;

    const rewards = await prisma.reward.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        description: true,
        amount: true,
        enrollmentAmount: true,
        type: true,
      },
    });

    if (!userId) {
      return NextResponse.json(
        rewards.map((r) => ({ ...r, enrolled: false, winStatus: null as string | null }))
      );
    }

    const wins = await prisma.rewardWinner.findMany({
      where: { userId },
      select: { rewardId: true, status: true },
    });
    const winByRewardId = new Map(wins.map((w) => [w.rewardId, w.status]));

    const list = rewards.map((r) => ({
      ...r,
      enrolled: winByRewardId.has(r.id),
      winStatus: winByRewardId.get(r.id) ?? null as string | null,
    }));

    return NextResponse.json(list);
  } catch (e) {
    console.error("GET /api/rewards:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
