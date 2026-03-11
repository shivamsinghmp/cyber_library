import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const redeemBodySchema = z.object({
  code: z.string().min(1, "Code is required").transform((s) => s.trim().toUpperCase()),
});

/**
 * Redeems the coupon for the current user (marks as used).
 * Call this only after payment success — then the coupon expires for this user.
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Login required to redeem coupon" },
        { status: 401 }
      );
    }
    const userId = (session.user as { id?: string }).id;
    if (!userId) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = redeemBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { code } = parsed.data;

    const coupon = await prisma.coupon.findFirst({
      where: { code, isActive: true },
      include: { _count: { select: { redemptions: true } } },
    });

    if (!coupon) {
      return NextResponse.json(
        { error: "Invalid or expired coupon code" },
        { status: 400 }
      );
    }

    const now = new Date();
    if (coupon.validFrom && now < coupon.validFrom) {
      return NextResponse.json(
        { error: "This coupon is not yet valid" },
        { status: 400 }
      );
    }
    if (coupon.validUntil && now > coupon.validUntil) {
      return NextResponse.json(
        { error: "This coupon has expired" },
        { status: 400 }
      );
    }

    if (coupon.maxTotalUses != null && coupon._count.redemptions >= coupon.maxTotalUses) {
      return NextResponse.json(
        { error: "This coupon has reached its usage limit" },
        { status: 400 }
      );
    }

    const existing = await prisma.couponRedemption.findUnique({
      where: {
        couponId_userId: { couponId: coupon.id, userId },
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: "You have already used this coupon" },
        { status: 400 }
      );
    }

    await prisma.couponRedemption.create({
      data: { couponId: coupon.id, userId },
    });

    return NextResponse.json({
      success: true,
      message: "Coupon redeemed. It is now used for your account.",
    });
  } catch (e) {
    console.error("POST /api/coupon/redeem:", e);
    return NextResponse.json({ error: "Failed to redeem coupon" }, { status: 500 });
  }
}
