import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-helpers";

export async function GET() {
  try {
    const auth = await requireUser();
    if (auth.error) return auth.error;

    if (auth.user.role !== "INFLUENCER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const userId = auth.user.id;

    const [coupons, earnings] = await Promise.all([
      prisma.coupon.findMany({
        where: { ownerId: userId },
        include: {
          redemptions: true,
          earnings: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.influencerEarning.findMany({
        where: { influencerId: userId },
        include: {
          coupon: { select: { code: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const totalRedemptions = coupons.reduce((sum, c) => sum + c.redemptions.length, 0);
    const totalPaidConversions = earnings.length;
    const totalEarnings = earnings.reduce((sum, e) => sum + e.commissionAmount, 0);
    const pendingEarnings = earnings
      .filter((e) => e.status === "PENDING")
      .reduce((sum, e) => sum + e.commissionAmount, 0);
    const paidEarnings = earnings
      .filter((e) => e.status === "PAID")
      .reduce((sum, e) => sum + e.commissionAmount, 0);

    const couponStats = coupons.map((c) => ({
      id: c.id,
      code: c.code,
      discountType: c.discountType,
      discountValue: c.discountValue,
      commissionRate: c.commissionRate,
      isActive: c.isActive,
      redemptionCount: c.redemptions.length,
      earningCount: c.earnings.length,
      earningsTotal: c.earnings.reduce((s, e) => s + e.commissionAmount, 0),
    }));

    // Fetch buyer emails for display (masked on client)
    const buyerIds = [...new Set(earnings.map((e) => e.userId))];
    const buyers = await prisma.user.findMany({
      where: { id: { in: buyerIds } },
      select: { id: true, email: true },
    });
    const buyerEmailMap = new Map(buyers.map((b) => [b.id, b.email]));

    const earningDetails = earnings.map((e) => ({
      id: e.id,
      couponCode: e.coupon.code,
      transactionAmount: e.transactionAmount,
      commissionAmount: e.commissionAmount,
      status: e.status,
      paidAt: e.paidAt,
      createdAt: e.createdAt,
      buyerEmail: buyerEmailMap.get(e.userId) ?? null,
    }));

    return NextResponse.json({
      totalRedemptions,
      totalPaidConversions,
      totalEarnings,
      pendingEarnings,
      paidEarnings,
      coupons: couponStats,
      earnings: earningDetails,
    });
  } catch (e) {
    console.error("GET /api/influencer/stats:", e);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
