import { NextResponse } from "next/server";
import { getRazorpayCredentials } from "@/lib/razorpay-credentials";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { fulfillOrder } from "@/lib/order-fulfillment";
import { DEFAULT_PRICING } from "@/lib/pricing-defaults";
import { rateLimit } from "@/lib/rate-limit";

const COIN_PACKS: Record<string, { coins: number; priceRupees: number; label: string }> = {
  COINS_100:  { coins: 100,  priceRupees: 10,  label: "Starter Pack"  },
  COINS_350:  { coins: 350,  priceRupees: 30,  label: "Study Pack"    },
  COINS_700:  { coins: 700,  priceRupees: 55,  label: "Power Pack"    },
  COINS_1500: { coins: 1500, priceRupees: 100, label: "Pro Pack"      },
};

const bodySchema = z.object({
  type: z.enum(["CART", "PRODUCT", "REWARD", "SUBSCRIPTION", "COIN_PACK"]),
  ids: z.array(z.string()).min(1),
  couponCode: z.string().optional(),
});

/** Create a Razorpay order. Returns orderId and keyId for frontend checkout. */
export async function POST(request: Request) {
  try {
    const credentials = await getRazorpayCredentials();
    if (!credentials) {
      return NextResponse.json(
        { error: "Razorpay not configured. Add keys in Admin → Razorpay API." },
        { status: 503 }
      );
    }

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      console.error("[create-order] Invalid payload:", JSON.stringify(body), parsed.error.flatten());
      return NextResponse.json({ error: "Invalid payload format" }, { status: 400 });
    }
    
    const { type, ids, couponCode } = parsed.data;
    let computedAmountRupees = 0;

    const session = await auth();
    const userId = (session?.user as { id?: string })?.id;
    if (!userId) {
      return NextResponse.json({ error: "Login karo pehle." }, { status: 401 });
    }

    // 10 order attempts per user per hour
    const rl = rateLimit(`create_order_user:${userId}`, 10, 3600);
    if (!rl.success) {
      return NextResponse.json({ error: "Too many order attempts. 1 ghante baad try karo." }, { status: 429 });
    }

    // 1. Calculate base amount from strictly trusted database tables
    if (type === "COIN_PACK") {
      const packId = ids[0];
      if (packId.startsWith("COINS_CUSTOM_")) {
        const rupees = parseInt(packId.replace("COINS_CUSTOM_", ""), 10);
        if (!Number.isFinite(rupees) || rupees < 10 || rupees > 10000)
          return NextResponse.json({ error: "Custom amount ₹10 se ₹10,000 ke beech hona chahiye." }, { status: 400 });
        computedAmountRupees = rupees;
      } else {
        const pack = COIN_PACKS[packId];
        if (!pack) return NextResponse.json({ error: "Invalid coin pack" }, { status: 400 });
        computedAmountRupees = pack.priceRupees;
      }
    } else if (type === "CART") {
      // Filter out already-enrolled slots to prevent double booking
      const existingSubs = await prisma.roomSubscription.findMany({
        where: { userId, studySlotId: { in: ids } },
        select: { studySlotId: true },
      });
      const alreadyEnrolled = new Set(existingSubs.map(s => s.studySlotId));
      const filteredIds = ids.filter(id => !alreadyEnrolled.has(id));
      if (filteredIds.length === 0) {
        return NextResponse.json({ error: "You are already enrolled in all selected slots." }, { status: 400 });
      }
      if (filteredIds.length < ids.length) {
        parsed.data.ids = filteredIds;
      }
      const slots = await prisma.studySlot.findMany({
        where: { id: { in: filteredIds } },
        select: { price: true },
      });
      computedAmountRupees = slots.reduce((sum, slot) => sum + slot.price, 0);
    } else if (type === "PRODUCT") {
      const product = await prisma.digitalProduct.findUnique({
        where: { id: ids[0] },
        select: { price: true },
      });
      if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
      computedAmountRupees = product.price;
    } else if (type === "REWARD") {
      const reward = await prisma.reward.findUnique({
        where: { id: ids[0] },
        select: { enrollmentAmount: true },
      });
      if (!reward) return NextResponse.json({ error: "Reward not found" }, { status: 404 });
      computedAmountRupees = reward.enrollmentAmount;
    } else if (type === "SUBSCRIPTION") {
      const planType = ids[0] as "MONTHLY" | "YEARLY";
      if (planType !== "MONTHLY" && planType !== "YEARLY") {
        return NextResponse.json({ error: "Invalid plan type" }, { status: 400 });
      }
      // Block if user already has an active subscription of the SAME or HIGHER plan.
      // Allow upgrade: Monthly → Yearly (planType upgrade is permitted).
      const activeSub = await prisma.userSubscription.findFirst({
        where: { userId, status: "ACTIVE", endDate: { gt: new Date() } },
        select: { id: true, planType: true, endDate: true },
      });
      if (activeSub) {
        const isUpgrade = activeSub.planType === "MONTHLY" && planType === "YEARLY";
        if (!isUpgrade) {
          return NextResponse.json(
            { error: `Aapka ${activeSub.planType === "MONTHLY" ? "Monthly" : "Yearly"} subscription already active hai. Expiry ke baad renew karein.` },
            { status: 400 }
          );
        }
        // Upgrade allowed — cancel the existing monthly sub before creating yearly.
        // Use updateMany with status filter (optimistic lock): if another concurrent
        // request already cancelled it, count === 0 and we return 409 to avoid
        // both requests proceeding to create a Razorpay order.
        const cancelled = await prisma.userSubscription.updateMany({
          where: { id: activeSub.id, status: "ACTIVE" },
          data:  { status: "CANCELLED" },
        });
        if (cancelled.count === 0) {
          return NextResponse.json(
            { error: "Subscription state just changed. Dobara try karo." },
            { status: 409 }
          );
        }
      }
      // Fetch authoritative price from DB — fall back to DEFAULT_PRICING only when DB has no entry
      const { getAppSetting } = await import("@/lib/app-settings");
      const raw = await getAppSetting("PRICING_DATA");
      const tierKey = planType === "MONTHLY" ? "monthly" : "yearly";
      let serverOfferPrice: number;
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          const dbPrice = Number(parsed?.[tierKey]?.offerPrice);
          // 0 is valid (free plan) — only fall back if value is not a finite number
          serverOfferPrice = Number.isFinite(dbPrice) ? dbPrice : DEFAULT_PRICING[tierKey].offerPrice;
        } catch {
          serverOfferPrice = DEFAULT_PRICING[tierKey].offerPrice;
        }
      } else {
        serverOfferPrice = DEFAULT_PRICING[tierKey].offerPrice;
      }
      if (serverOfferPrice < 0) {
        return NextResponse.json({ error: "Pricing not configured" }, { status: 503 });
      }
      computedAmountRupees = serverOfferPrice;
    }

    // 2. Validate and apply coupon authentically on the backend
    let discount = 0;
    if (couponCode && computedAmountRupees > 0) {
      if (session?.user?.id) {
        const coupon = await prisma.coupon.findUnique({ where: { code: couponCode } });
        const now = new Date();
        if (coupon && coupon.isActive && (!coupon.validFrom || coupon.validFrom <= now) && (!coupon.validUntil || coupon.validUntil > now)) {
          
          let hasUsed = false;
          const userUse = await prisma.couponRedemption.findUnique({
             where: { couponId_userId: { couponId: coupon.id, userId } }
          });
          if (userUse) hasUsed = true;
          
          const validMin = coupon.minOrderAmount ? computedAmountRupees >= coupon.minOrderAmount : true;

          let redemptionCount = 0;
          if (coupon.maxTotalUses) {
            redemptionCount = await prisma.couponRedemption.count({ where: { couponId: coupon.id } });
          }
          const validUsage = coupon.maxTotalUses ? redemptionCount < coupon.maxTotalUses : true;

          if (!hasUsed && validMin && validUsage) {
            if (coupon.discountType === "FIXED") discount = Math.min(coupon.discountValue, computedAmountRupees);
            else if (coupon.discountType === "PERCENT") discount = Math.min(Math.round((computedAmountRupees * coupon.discountValue) / 100), computedAmountRupees);
          }
        }
      }
    }

    // 3. Convert to Paise exactly
    const finalAmountRupees = Math.max(0, computedAmountRupees - discount);
    const amountPaise = Math.round(finalAmountRupees * 100);

    // If order becomes completely free due to coupons, fulfill immediately on backend
    if (amountPaise < 1) {
      const txn = await fulfillOrder({
        userId,
        type,
        ids,
        amountRupees: 0,
        couponCode: couponCode || undefined,
      });
      return NextResponse.json({
        orderId: `free_${Date.now()}`,
        amount: 0,
        free: true,
        transactionId: txn.transactionId,
      });
    }

    const rzpController = new AbortController();
    const rzpTimer = setTimeout(() => rzpController.abort(), 15_000);
    // Idempotency key = userId + items hash — prevents double-charge on network retry
    const idempotencyKey = `${userId}-${Buffer.from(JSON.stringify(ids)).toString("base64url").slice(0, 32)}`;
    // Bind purchase intent to this order on Razorpay's servers.
    // Verified in /api/razorpay/verify to prevent order substitution attacks
    // (where a valid signature for order A is used to fulfill a different item B).
    const idsHash = crypto
      .createHash("sha256")
      .update(JSON.stringify([...ids].sort()))
      .digest("hex")
      .slice(0, 32);
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      signal: rzpController.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + Buffer.from(credentials.keyId + ":" + credentials.keySecret).toString("base64"),
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: "INR",
        receipt: "rcpt_" + Date.now(),
        notes: {
          type,
          ids_hash: idsHash,
          uid: userId.slice(0, 20),
        },
      }),
    }).finally(() => clearTimeout(rzpTimer));

    if (!res.ok) {
      const err = await res.text();
      console.error("Razorpay create order error:", res.status, err);
      return NextResponse.json(
        { error: "Failed to create payment order" },
        { status: 502 }
      );
    }

    const order = (await res.json()) as { id: string };
    return NextResponse.json({
      orderId: order.id,
      keyId: credentials.keyId,
      amount: amountPaise,
    });
  } catch (e) {
    console.error("POST /api/razorpay/create-order:", e);
    return NextResponse.json(
      { error: "Payment service error" },
      { status: 500 }
    );
  }
}
