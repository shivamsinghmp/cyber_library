import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/** POST: Enroll in a reward (creates RewardWinner). Call after payment success or for free enrollment. */
export async function POST(request: Request) {
  try {
    const session = await auth();
    const userId = (session?.user as { id?: string })?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json().catch(() => ({}));
    const rewardId = typeof body.rewardId === "string" ? body.rewardId.trim() : null;
    if (!rewardId) {
      return NextResponse.json({ error: "rewardId required" }, { status: 400 });
    }

    const reward = await prisma.reward.findUnique({
      where: { id: rewardId, isActive: true },
    });
    if (!reward) {
      return NextResponse.json({ error: "Reward not found or inactive" }, { status: 404 });
    }

    const existing = await prisma.rewardWinner.findUnique({
      where: { userId_rewardId: { userId, rewardId } },
    });
    if (existing) {
      return NextResponse.json({ error: "Already enrolled in this reward" }, { status: 400 });
    }

    await prisma.rewardWinner.create({
      data: { userId, rewardId, status: "PENDING" },
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("POST /api/user/rewards/enroll:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
