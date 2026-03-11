import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const applyBodySchema = z.object({
  code: z.string().min(1, "Code is required").transform((s) => s.trim().toUpperCase()),
  orderAmount: z.number().min(0).optional().default(0),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Login required to apply a coupon" },
        { status: 401 }
      );
    }
    const userId = (session.user as { id?: string }).id;
    if (!userId) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = applyBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { code, orderAmount } = parsed.data;

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
        { error: "You have already used this coupon once" },
        { status: 400 }
      );
    }

    const minOrder = coupon.minOrderAmount ?? 0;
    if (orderAmount < minOrder) {
      return NextResponse.json(
        { error: `Minimum order amount for this coupon is ₹${minOrder}` },
        { status: 400 }
      );
    }

    let discountAmount: number;
    if (coupon.discountType === "PERCENT") {
      discountAmount = Math.round((orderAmount * coupon.discountValue) / 100);
    } else {
      discountAmount = Math.min(coupon.discountValue, orderAmount);
    }

    // Do NOT redeem here — coupon is redeemed only after payment success (see /api/coupon/redeem).

    return NextResponse.json({
      success: true,
      couponId: coupon.id,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountAmount,
      description: coupon.description ?? (coupon.discountType === "PERCENT"
        ? `${coupon.discountValue}% off`
        : `₹${coupon.discountValue} off`),
    });
  } catch (e) {
    console.error("POST /api/coupon/apply:", e);
    return NextResponse.json({ error: "Failed to apply coupon" }, { status: 500 });
  }
}
