import { prisma } from "@/lib/prisma";
import { generateTransactionId } from "@/lib/transactionId";
import { addStudentToCalendarEvent } from "@/lib/google-calendar";
import { sendWhatsAppTemplate } from "@/lib/whatsapp";
import { sendPurchaseReceipt } from "@/lib/email";

export async function fulfillOrder({
  userId,
  type,
  ids,
  amountRupees,
  paymentGatewayId,
  couponCode,
}: {
  userId: string;
  type: "CART" | "PRODUCT" | "REWARD" | "SUBSCRIPTION";
  ids: string[];
  amountRupees: number;
  paymentGatewayId?: string;
  couponCode?: string;
}) {
  const transactionId = await generateTransactionId();
  const fulfillMeta: { planType?: "MONTHLY" | "YEARLY"; membershipStart?: Date; membershipEnd?: Date } = {};

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, referredById: true, referralRewarded: true, profile: { select: { phone: true, whatsappNumber: true, fullName: true } } },
  });

  const userPhone = user?.profile?.whatsappNumber || user?.profile?.phone;
  const userName = user?.profile?.fullName ? user.profile.fullName.split(' ')[0] : 'Student';

  // 1. Generate OrderDetails metadata for the transaction
  let orderDetails: Array<{ slotId?: string; productId?: string; name: string; price: number }> = [];

  if (type === "CART") {
    const slots = await prisma.studySlot.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, price: true, timeLabel: true, meetLink: true, calendarEventId: true },
    });
    orderDetails = slots.map(s => ({ slotId: s.id, name: `${s.name} (${s.timeLabel})`, price: s.price }));

    // Grant Room Subscriptions atomically — skip already enrolled, createMany for the rest
    const existingSubs = await prisma.roomSubscription.findMany({
      where: { userId, studySlotId: { in: slots.map(s => s.id) } },
      select: { studySlotId: true },
    });
    const alreadyEnrolled = new Set(existingSubs.map(s => s.studySlotId));
    const newSlots = slots.filter(s => !alreadyEnrolled.has(s.id));

    if (newSlots.length > 0) {
      await prisma.roomSubscription.createMany({
        data: newSlots.map(s => ({ userId, studySlotId: s.id })),
        skipDuplicates: true,
      });

      for (const slot of newSlots) {
        if (slot.calendarEventId && user?.email) {
          addStudentToCalendarEvent(slot.calendarEventId, user.email).catch(err => {
            console.error(`[fulfillOrder] Calendar invite failed for userId=${userId} slotId=${slot.id}:`, err);
          });
        }
        if (userPhone) {
          sendWhatsAppTemplate(userPhone, "room_subscription_confirmation", "en", [userName, slot.name, slot.timeLabel]).catch(err => console.error("WA Temp Err:", err));
        }
      }
    }
  } else if (type === "PRODUCT") {
    const product = await prisma.digitalProduct.findUnique({ where: { id: ids[0] } });
    if (product) {
      orderDetails = [{ productId: product.id, name: product.name, price: product.price }];
      const alreadyPurchased = await prisma.digitalPurchase.findFirst({
        where: { userId, productId: product.id },
      });
      if (!alreadyPurchased) {
        await prisma.digitalPurchase.create({
          data: { userId, productId: product.id, transactionId },
        });
      }
    }
  } else if (type === "REWARD") {
    const reward = await prisma.reward.findUnique({ where: { id: ids[0] } });
    if (reward) {
      orderDetails = [{ name: `Reward: ${reward.name}`, price: reward.enrollmentAmount }];

      const existing = await prisma.rewardWinner.findUnique({ where: { userId_rewardId: { userId, rewardId: reward.id } } });
      if (!existing) {
        await prisma.rewardWinner.create({
          data: { userId, rewardId: reward.id, status: "PENDING" },
        });
      }
    }
  } else if (type === "SUBSCRIPTION") {
    // ids[0] = planType ("MONTHLY" | "YEARLY")
    const planType = ids[0] as "MONTHLY" | "YEARLY";
    const now = new Date();
    const endDate = new Date(now);
    if (planType === "MONTHLY") endDate.setMonth(endDate.getMonth() + 1);
    else endDate.setFullYear(endDate.getFullYear() + 1);

    orderDetails = [{ name: `${planType === "MONTHLY" ? "Monthly" : "Yearly"} Membership`, price: amountRupees }];

    // Cancel any existing active subscription first
    await prisma.userSubscription.updateMany({
      where: { userId, status: "ACTIVE" },
      data: { status: "CANCELLED" },
    });

    await prisma.userSubscription.create({
      data: {
        userId,
        planType,
        startDate: now,
        endDate,
        status: "ACTIVE",
        amountPaid: amountRupees,
        transactionId,
        paymentGatewayId: paymentGatewayId ?? null,
      },
    });

    fulfillMeta.planType        = planType;
    fulfillMeta.membershipStart = now;
    fulfillMeta.membershipEnd   = endDate;
  }

  // 2. Create the unified Transaction
  const txn = await prisma.transaction.create({
    data: {
      transactionId,
      userId,
      amount: amountRupees,
      currency: "INR",
      status: "SUCCESS",
      paymentGatewayId: paymentGatewayId ?? null,
      orderDetails: orderDetails,
    },
  });

  // 3. Record coupon redemption (now that payment is confirmed)
  // Use createMany + skipDuplicates so a retry/race never double-counts the redemption.
  if (couponCode) {
    try {
      const coupon = await prisma.coupon.findUnique({ where: { code: couponCode }, select: { id: true } });
      if (coupon) {
        await prisma.couponRedemption.createMany({
          data: [{ couponId: coupon.id, userId }],
          skipDuplicates: true,
        });
      }
    } catch (e) {
      console.error("[fulfillOrder] Coupon redemption record failed:", e);
    }
  }

  // 4. Send purchase receipt email (fire-and-forget)
  if (user?.email) {
    sendPurchaseReceipt({
      to: user.email,
      customerName: user.profile?.fullName ?? null,
      transactionId,
      items: orderDetails.map((i) => ({ name: i.name, price: i.price })),
      totalAmount: amountRupees,
      paymentId: paymentGatewayId ?? null,
      planType:        fulfillMeta.planType        ?? null,
      membershipStart: fulfillMeta.membershipStart ?? null,
      membershipEnd:   fulfillMeta.membershipEnd   ?? null,
    }).catch((e) => console.error("[fulfillOrder] Receipt email failed:", e));
  }

  // 5. Process Referral First-Transaction logic
  if (user && user.referredById && !user.referralRewarded) {
    try {
      const reward = await prisma.reward.findFirst({ where: { type: "REFERRAL", isActive: true }, orderBy: { createdAt: "desc" } });
      if (reward) {
        await prisma.$transaction([
          prisma.rewardWinner.upsert({
            where: { userId_rewardId: { userId, rewardId: reward.id } },
            create: { userId: userId, rewardId: reward.id, status: "PENDING" }, update: {}
          }),
          prisma.rewardWinner.upsert({
            where: { userId_rewardId: { userId: user.referredById, rewardId: reward.id } },
            create: { userId: user.referredById, rewardId: reward.id, status: "PENDING" }, update: {}
          }),
          prisma.user.update({
            where: { id: userId },
            data: { referralRewarded: true },
          }),
        ]);
      }
    } catch (e) {
      console.error("Referral process error:", e);
    }
  }

  return txn;
}
