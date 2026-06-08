import { prisma } from "@/lib/prisma";

export type PlanAccessState = "paid" | "trial" | "expired" | "trial_expired" | "no_plan";

export type PlanAccess = {
  allowed: boolean;
  state: PlanAccessState;
  daysLeft?: number;
  planType?: string;
  message?: string;
};

export async function checkMeetAddonAccess(userId: string): Promise<PlanAccess> {
  const now = new Date();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user) return { allowed: false, state: "no_plan", message: "User not found" };

  // Admins and employees bypass plan check
  if (["ADMIN", "EMPLOYEE"].includes(user.role)) {
    return { allowed: true, state: "paid" };
  }

  // Check active subscription (paid or trial)
  const sub = await prisma.userSubscription.findFirst({
    where: { userId, status: "ACTIVE", endDate: { gt: now } },
    orderBy: { endDate: "desc" },
    select: { planType: true, endDate: true },
  });

  if (sub) {
    const daysLeft = Math.ceil((sub.endDate.getTime() - now.getTime()) / 86400000);
    return {
      allowed: true,
      state: sub.planType === "TRIAL" ? "trial" : "paid",
      daysLeft,
      planType: sub.planType,
    };
  }

  // Check if they had an expired subscription
  const expiredSub = await prisma.userSubscription.findFirst({
    where: { userId, status: { in: ["EXPIRED", "CANCELLED"] } },
    orderBy: { endDate: "desc" },
    select: { planType: true },
  });

  if (expiredSub) {
    return {
      allowed: false,
      state: expiredSub.planType === "TRIAL" ? "trial_expired" : "expired",
      message:
        expiredSub.planType === "TRIAL"
          ? "Your free trial has ended. Please get a paid plan."
          : "Your plan has expired. Please renew.",
    };
  }

  return {
    allowed: false,
    state: "no_plan",
    message: "This feature is only available to subscribers.",
  };
}
