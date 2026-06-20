import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-helpers";

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const now = new Date();

    const influencers = await prisma.user.findMany({
      where: { role: "INFLUENCER", deletedAt: null },
      include: {
        profile: true,
        influencerProfile: true,
        ownedCoupons: {
          include: {
            redemptions: true,
            earnings: true,
          },
        },
        influencerEarnings: true,
        clicksAsInfluencer: true,
        influencerReferredUsers: {
          where: { deletedAt: null },
          include: {
            userSubscriptions: { orderBy: { createdAt: "desc" } },
            influencerEarnings: true,
            transactions: { where: { status: "SUCCESS" }, select: { amount: true } },
            couponRedemptions: { include: { coupon: { select: { ownerId: true } } } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const result = influencers.map((inf) => {
      const totalRedemptions = inf.ownedCoupons.reduce(
        (sum, c) => sum + c.redemptions.length,
        0
      );
      const totalPaidConversions = inf.influencerEarnings.length;
      const totalEarnings = inf.influencerEarnings.reduce(
        (sum, e) => sum + e.commissionAmount,
        0
      );
      const pendingEarnings = inf.influencerEarnings
        .filter((e) => e.status === "PENDING")
        .reduce((sum, e) => sum + e.commissionAmount, 0);
      const paidEarnings = inf.influencerEarnings
        .filter((e) => e.status === "PAID")
        .reduce((sum, e) => sum + e.commissionAmount, 0);

      const referredUsers = inf.influencerReferredUsers.map((u) => {
        const activePlan = u.userSubscriptions.find(
          (s) => s.status === "ACTIVE" && s.endDate > now && s.planType !== "TRIAL"
        );
        const trialSub = u.userSubscriptions.find((s) => s.planType === "TRIAL");
        const trialActive = trialSub && trialSub.status === "ACTIVE" && trialSub.endDate > now;

        const totalPurchaseAmount = u.transactions.reduce((s, t) => s + t.amount, 0);
        const commissionEarned = u.influencerEarnings
          .filter((e) => e.influencerId === inf.id)
          .reduce((s, e) => s + e.commissionAmount, 0);
        const pendingCommission = u.influencerEarnings
          .filter((e) => e.influencerId === inf.id && e.status === "PENDING")
          .reduce((s, e) => s + e.commissionAmount, 0);
        const paidCommission = u.influencerEarnings
          .filter((e) => e.influencerId === inf.id && e.status === "PAID")
          .reduce((s, e) => s + e.commissionAmount, 0);

        const usedCouponFromInfluencer = u.couponRedemptions.some(
          (r) => r.coupon.ownerId === inf.id
        );

        return {
          id: u.id,
          name: u.name,
          email: u.email, // full email for admin — no masking
          joinedAt: u.createdAt.toISOString(),
          trialStatus: trialActive ? "ACTIVE" : trialSub ? "EXPIRED" : "NONE",
          trialEndDate: trialSub?.endDate?.toISOString() ?? null,
          planStatus: activePlan ? "ACTIVE" : u.userSubscriptions.some(s => s.planType !== "TRIAL") ? "EXPIRED" : "NONE",
          planType: activePlan?.planType ?? null,
          planEndDate: activePlan?.endDate?.toISOString() ?? null,
          totalPurchaseAmount,
          commissionEarned,
          pendingCommission,
          paidCommission,
          attributionMethod: usedCouponFromInfluencer ? "COUPON" : "LINK",
        };
      });

      return {
        id: inf.id,
        name: inf.name,
        email: inf.email,
        referralCode: inf.referralCode,
        createdAt: inf.createdAt,
        profile: inf.profile,
        influencerProfile: inf.influencerProfile,
        coupons: inf.ownedCoupons.map((c) => ({
          id: c.id,
          code: c.code,
          discountType: c.discountType,
          discountValue: c.discountValue,
          commissionRate: c.commissionRate,
          redemptionCount: c.redemptions.length,
          earningCount: c.earnings.length,
          earningsTotal: c.earnings.reduce((s, e) => s + e.commissionAmount, 0),
        })),
        earnings: inf.influencerEarnings,
        totalRedemptions,
        totalPaidConversions,
        totalEarnings,
        pendingEarnings,
        paidEarnings,
        linkClicks: inf.clicksAsInfluencer.length,
        registrationsViaLink: inf.clicksAsInfluencer.filter((c: { userId: string | null }) => c.userId !== null).length,
        conversionsViaLink: inf.clicksAsInfluencer.filter((c: { convertedAt: Date | null }) => c.convertedAt !== null).length,
        referralLink: inf.referralCode ? `https://lstudy.in/join?ref=${inf.referralCode}` : null,
        referredUsers,
      };
    });

    return NextResponse.json(result);
  } catch (e) {
    console.error("GET /api/admin/influencers:", e);
    return NextResponse.json({ error: "Failed to fetch influencers" }, { status: 500 });
  }
}
