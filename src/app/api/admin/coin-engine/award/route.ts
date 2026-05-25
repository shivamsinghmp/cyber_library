import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { awardCoins, deductCoins } from "@/lib/coins";
import { requireSuperAdmin } from "@/lib/api-helpers";
import { z } from "zod";

const bodySchema = z.object({
  userId: z.string().min(1),
  amount: z.number().int().refine((n) => n !== 0, "Amount cannot be zero"),
  reason: z.string().min(1).max(100),
});

export async function POST(request: Request) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;

    const body = await request.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });
    }

    const { userId, amount, reason } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, profile: { select: { coinBalance: true, fullName: true } } },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const adminReason = `ADMIN_MANUAL:${reason}`;

    if (amount > 0) {
      await awardCoins(userId, amount, adminReason);
    } else {
      const ok = await deductCoins(userId, Math.abs(amount), adminReason);
      if (!ok) {
        return NextResponse.json({ error: "Insufficient coin balance to deduct" }, { status: 400 });
      }
    }

    const updated = await prisma.profile.findUnique({
      where: { userId },
      select: { coinBalance: true },
    });

    return NextResponse.json({
      success: true,
      newBalance: updated?.coinBalance ?? 0,
      awarded: amount,
    });
  } catch (e) {
    console.error("POST /api/admin/coin-engine/award:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
