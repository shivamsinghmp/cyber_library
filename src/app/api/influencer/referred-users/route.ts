import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

function maskEmail(email: string): string {
  const [local, domain] = email.split("@")
  if (!local || !domain) return email
  return `${local.slice(0, 2)}***@${domain}`
}

export async function GET() {
  const session = await auth()
  const userId = (session?.user as { id?: string })?.id
  const role = (session?.user as { role?: string })?.role
  if (!userId || (role !== "INFLUENCER" && role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const users = await prisma.user.findMany({
    where: { referredByInfluencer: userId, deletedAt: null },
    include: {
      userSubscriptions: { orderBy: { createdAt: "desc" } },
      influencerEarnings: { where: { influencerId: userId } },
      transactions: { where: { status: "SUCCESS" }, select: { amount: true } },
      couponRedemptions: { include: { coupon: { select: { ownerId: true } } } },
    },
    orderBy: { createdAt: "desc" },
  })

  const now = new Date()

  const result = users.map((u) => {
    const activePlan = u.userSubscriptions.find(
      (s) => s.status === "ACTIVE" && s.endDate > now && s.planType !== "TRIAL"
    )
    const trialSub = u.userSubscriptions.find((s) => s.planType === "TRIAL")
    const trialActive = trialSub && trialSub.status === "ACTIVE" && trialSub.endDate > now

    const totalPurchaseAmount = u.transactions.reduce((s, t) => s + t.amount, 0)
    const commissionEarned = u.influencerEarnings.reduce((s, e) => s + e.commissionAmount, 0)
    const pendingCommission = u.influencerEarnings.filter(e => e.status === "PENDING").reduce((s, e) => s + e.commissionAmount, 0)
    const paidCommission = u.influencerEarnings.filter(e => e.status === "PAID").reduce((s, e) => s + e.commissionAmount, 0)

    const usedCouponFromInfluencer = u.couponRedemptions.some(
      (r) => r.coupon.ownerId === userId
    )

    return {
      id: u.id,
      name: u.name,
      email: maskEmail(u.email),
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
    }
  })

  return NextResponse.json(result)
}
