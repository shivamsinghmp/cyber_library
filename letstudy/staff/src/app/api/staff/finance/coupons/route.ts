import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkStaffModuleApi } from "@/lib/permissions";

/** GET only — validate a coupon code for a support query. No create/edit/
 *  delete here (coupon management, incl. influencer commission rates,
 *  stays admin-only in portal). */
export async function GET(request: Request) {
  try {
    const auth = await checkStaffModuleApi("FINANCE");
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code")?.trim();
    if (!code) return NextResponse.json({ error: "Missing code" }, { status: 400 });

    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
      select: {
        code: true,
        discountType: true,
        discountValue: true,
        minOrderAmount: true,
        maxTotalUses: true,
        validFrom: true,
        validUntil: true,
        isActive: true,
        description: true,
        _count: { select: { redemptions: true } },
      },
    });

    if (!coupon) return NextResponse.json({ found: false });

    const now = new Date();
    const expired = !!coupon.validUntil && coupon.validUntil < now;
    const notYetValid = !!coupon.validFrom && coupon.validFrom > now;
    const usedUp = !!coupon.maxTotalUses && coupon._count.redemptions >= coupon.maxTotalUses;

    return NextResponse.json({
      found: true,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      minOrderAmount: coupon.minOrderAmount,
      description: coupon.description,
      isActive: coupon.isActive,
      usedCount: coupon._count.redemptions,
      maxTotalUses: coupon.maxTotalUses,
      validFrom: coupon.validFrom,
      validUntil: coupon.validUntil,
      currentlyValid: coupon.isActive && !expired && !notYetValid && !usedUp,
    });
  } catch (e) {
    console.error("GET /api/staff/finance/coupons:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
