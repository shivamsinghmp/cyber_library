import { prisma } from "@/lib/prisma";
import { generateTransactionId } from "@/lib/transactionId";
import { addStudentToCalendarEvent } from "@/lib/google-calendar";
import { sendWhatsAppTemplate } from "@/lib/whatsapp";

export async function fulfillOrder({
  userId,
  type,
  ids,
  amountRupees,
  paymentGatewayId,
}: {
  userId: string;
  type: "CART" | "PRODUCT" | "REWARD";
  ids: string[];
  amountRupees: number;
  paymentGatewayId?: string;
}) {
  const transactionId = await generateTransactionId();

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

    // Grant Room Subscriptions (skip already enrolled)
    for (const slot of slots) {
      const existing = await prisma.roomSubscription.findUnique({
        where: { userId_studySlotId: { userId, studySlotId: slot.id } },
      });
      if (existing) {
        console.info(`fulfillOrder: userId=${userId} already enrolled in slot=${slot.id}, skipping`);
        continue;
      }
      await prisma.roomSubscription.create({
        data: { userId, studySlotId: slot.id },
      });

      if (slot.calendarEventId && user?.email) {
        addStudentToCalendarEvent(slot.calendarEventId, user.email).catch(err => {
          console.error(`[fulfillOrder] Calendar invite failed for userId=${userId} slotId=${slot.id}:`, err);
        });
      }

      if (userPhone) {
         sendWhatsAppTemplate(userPhone, "room_subscription_confirmation", "en", [userName, slot.name, slot.timeLabel]).catch(err => console.error("WA Temp Err:", err));
      }
    }
  } else if (type === "PRODUCT") {
    const product = await prisma.digitalProduct.findUnique({ where: { id: ids[0] } });
    if (product) {
      orderDetails = [{ productId: product.id, name: product.name, price: product.price }];
      // Grant Digital Product
      await prisma.digitalPurchase.create({
        data: { userId, productId: product.id, transactionId },
      });
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

  // 3. Process Referral First-Transaction logic
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
