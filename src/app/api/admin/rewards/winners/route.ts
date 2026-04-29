import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/api-helpers";

/** GET: List all reward winners (admin) */
export async function GET() {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    const { user } = auth;
    const list = await prisma.rewardWinner.findMany({
      orderBy: { wonAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true, studentId: true } },
        reward: { select: { id: true, name: true, amount: true, type: true } },
      },
    });
    return NextResponse.json(list);
  } catch (e) {
    console.error("GET /api/admin/rewards/winners:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

const addWinnerSchema = z.object({
  userId: z.string().min(1),
  rewardId: z.string().min(1),
  notes: z.string().optional(),
});

/** POST: Add a winner (admin) - user wins the reward, amount pending until marked paid */
export async function POST(request: Request) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    const { user } = auth;
    const body = await request.json();
    const parsed = addWinnerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "userId and rewardId required" }, { status: 400 });
    }
    const reward = await prisma.reward.findUnique({
      where: { id: parsed.data.rewardId },
    });
    if (!reward) {
      return NextResponse.json({ error: "Reward not found" }, { status: 404 });
    }
    const user = await prisma.user.findFirst({
      where: { id: parsed.data.userId, deletedAt: null },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const winner = await prisma.rewardWinner.upsert({
      where: {
        userId_rewardId: { userId: parsed.data.userId, rewardId: parsed.data.rewardId },
      },
      create: {
        userId: parsed.data.userId,
        rewardId: parsed.data.rewardId,
        notes: parsed.data.notes ?? null,
      },
      update: { notes: parsed.data.notes ?? undefined },
      include: {
        user: { select: { id: true, name: true, email: true, studentId: true } },
        reward: { select: { id: true, name: true, amount: true } },
      },
    });
    return NextResponse.json(winner, { status: 201 });
  } catch (e) {
    console.error("POST /api/admin/rewards/winners:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
