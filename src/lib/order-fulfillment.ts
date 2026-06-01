import { prisma } from "@/lib/prisma";
import { awardCoins } from "@/lib/coins";
import { generateTransactionId } from "@/lib/transactionId";
import { addStudentToCalendarEvent } from "@/lib/google-calendar";
import { sendWhatsAppTemplate } from "@/lib/whatsapp";
import { sendPurchaseReceipt } from "@/lib/email";

const COIN_PACKS: Record<string, { coins: number; priceRupees: number; label: string }> = {
  COINS_100:  { coins: 100,  priceRupees: 10,  label: "Starter Pack"  },
  COINS_350:  { coins: 350,  priceRupees: 30,  label: "Study Pack"    },
  COINS_700:  { coins: 700,  priceRupees: 55,  label: "Power Pack"    },
  COINS_1500: { coins: 1500, priceRupees: 100, label: "Pro Pack"      },
};

export async function fulfillOrder({
  userId,
  type,
  ids,
  amountRupees,
  paymentGatewayId,
  couponCode,
}: {
  userId: string;
  type: "CART" | "PRODUCT" | "REWARD" | "SUBSCRIPTION" | "COIN_PACK";
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
  let cartSlots: { id: string; name: string; price: number; timeLabel: string; meetLink: string | null; calendarEventId: string | null }[] = [];

  if (type === "CART") {
    const slots = await prisma.studySlot.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, price: true, timeLabel: true, meetLink: true, calendarEventId: true },
    });
    cartSlots = slots;
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
  } else if (type === "COIN_PACK") {
    const packId = ids[0];
    let coinsToCredit = 0;
    let packLabel = "";
    if (packId.startsWith("COINS_CUSTOM_")) {
      const rupees = parseInt(packId.replace("COINS_CUSTOM_", ""), 10);
      coinsToCredit = rupees * 10;
      packLabel = `Custom Pack (${coinsToCredit} coins)`;
    } else {
      const pack = COIN_PACKS[packId];
      if (pack) { coinsToCredit = pack.coins; packLabel = `${pack.label} (${pack.coins} coins)`; }
    }
    if (coinsToCredit > 0) {
      orderDetails = [{ name: packLabel, price: amountRupees }];
      await awardCoins(userId, coinsToCredit, `COIN_PACK_${packId}`, undefined, undefined, {
        sourceCategory: "coin_pack",
        sourceLabel:    `Coin Pack: ${packLabel}`,
        referenceType:  "payment",
        referenceId:    paymentGatewayId ?? packId,
        referenceName:  packLabel,
        deviceType:     "web_browser",
      });
    }
  } else if (type === "SUBSCRIPTION") {
    // ids[0] = planType ("MONTHLY" | "YEARLY")
    const planType = ids[0] as "MONTHLY" | "YEARLY";
    const now = new Date();
    const endDate = new Date(now);
    if (planType === "MONTHLY") endDate.setMonth(endDate.getMonth() + 1);
    else endDate.setFullYear(endDate.getFullYear() + 1);

    orderDetails = [{ name: `${planType === "MONTHLY" ? "Monthly" : "Yearly"} Membership`, price: amountRupees }];

    // Block duplicate: do not enroll if user already has the same or a higher plan.
    // (Monthly → Yearly upgrade is allowed; the old plan was cancelled in create-order.)
    const existingActive = await prisma.userSubscription.findFirst({
      where: { userId, status: "ACTIVE", endDate: { gt: now } },
      select: { id: true, planType: true },
    });
    if (existingActive) {
      const isUpgrade = existingActive.planType === "MONTHLY" && planType === "YEARLY";
      if (!isUpgrade) throw new Error("ALREADY_SUBSCRIBED");
      // Cancel the old monthly sub before activating yearly
      await prisma.userSubscription.update({
        where: { id: existingActive.id },
        data: { status: "CANCELLED" },
      });
    }

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

    // Log trial→paid conversion (fire-and-forget)
    const { logTrialEvent } = await import("@/lib/trial-logger");
    const trialSub = await prisma.userSubscription.findFirst({
      where:  { userId, planType: "TRIAL" },
      select: { startDate: true },
      orderBy: { startDate: "desc" },
    });
    const daysUsed = trialSub
      ? Math.ceil((now.getTime() - trialSub.startDate.getTime()) / 86_400_000)
      : undefined;
    logTrialEvent({ userId, event: "converted", planBought: planType, daysUsed });
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
    // For CART enrollments, include meet links so student can join even if calendar invite is delayed
    // Reuse already-fetched cartSlots — no extra DB query needed
    const enrolledRoomsForEmail = type === "CART" && cartSlots.length > 0
      ? cartSlots.map(s => ({ name: s.name, timeLabel: s.timeLabel, meetLink: s.meetLink ?? null }))
      : null;

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
      enrolledRooms:   enrolledRoomsForEmail,
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
