import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET /api/public/coupons — returns active, public, not-expired coupons */
export async function GET() {
  try {
    const now = new Date();
    const coupons = await prisma.coupon.findMany({
      where: {
        isActive: true,
        isPublic: true,
        OR: [{ validUntil: null }, { validUntil: { gte: now } }],
        AND: [{ OR: [{ validFrom: null }, { validFrom: { lte: now } }] }],
      },
      select: {
        id: true,
        code: true,
        discountType: true,
        discountValue: true,
        description: true,
        minOrderAmount: true,
        validUntil: true,
        validFrom: true,
        maxTotalUses: true,
        _count: { select: { redemptions: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Filter out exhausted coupons (maxTotalUses reached)
    const available = coupons.filter(
      (c) => c.maxTotalUses == null || c._count.redemptions < c.maxTotalUses
    );

    return NextResponse.json(
      available.map(({ _count, ...c }) => c)
    );
  } catch (e) {
    console.error("GET /api/public/coupons:", e);
    return NextResponse.json([], { status: 200 });
  }
}
