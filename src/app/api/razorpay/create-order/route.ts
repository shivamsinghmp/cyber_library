import { NextResponse } from "next/server";
import { getRazorpayCredentials } from "@/lib/razorpay-credentials";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { fulfillOrder } from "@/lib/order-fulfillment";

const bodySchema = z.object({
  type: z.enum(["CART", "PRODUCT", "REWARD"]),
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
      return NextResponse.json({ error: "Invalid payload format" }, { status: 400 });
    }
    
    const { type, ids, couponCode } = parsed.data;
    let computedAmountRupees = 0;

    const session = await auth();

    // 1. Calculate base amount from strictly trusted database tables
    if (type === "CART") {
      // Filter out already-enrolled slots to prevent double booking
      const userId = (session?.user as { id?: string })?.id;
      let filteredIds = ids;
      if (userId) {
        const existingSubs = await prisma.roomSubscription.findMany({
          where: { userId, studySlotId: { in: ids } },
          select: { studySlotId: true },
        });
        const alreadyEnrolled = new Set(existingSubs.map(s => s.studySlotId));
        filteredIds = ids.filter(id => !alreadyEnrolled.has(id));
        if (filteredIds.length === 0) {
          return NextResponse.json({ error: "You are already enrolled in all selected slots." }, { status: 400 });
        }
        if (filteredIds.length < ids.length) {
          // Some were filtered — update ids for fulfillment
          parsed.data.ids = filteredIds;
        }
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
    }

    // 2. Validate and apply coupon authentically on the backend
    let discount = 0;
    if (couponCode && computedAmountRupees > 0) {
      if (session?.user?.id) {
        const coupon = await prisma.coupon.findUnique({ where: { code: couponCode } });
        if (coupon && coupon.isActive && (!coupon.validUntil || coupon.validUntil > new Date())) {
          
          let hasUsed = false;
          const userUse = await prisma.couponRedemption.findUnique({
             where: { couponId_userId: { couponId: coupon.id, userId: session.user.id } }
          });
          if (userUse) hasUsed = true;
          
          const validMin = coupon.minOrderAmount ? computedAmountRupees >= coupon.minOrderAmount : true;

          let redemptionCount = 0;
          if (coupon.maxTotalUses) {
            redemptionCount = await prisma.couponRedemption.count({ where: { couponId: coupon.id } });
          }
          const validUsage = coupon.maxTotalUses ? redemptionCount < coupon.maxTotalUses : true;

          if (!hasUsed && validMin && validUsage) {
            if (coupon.discountType === "FIXED") discount = coupon.discountValue;
            else if (coupon.discountType === "PERCENT") discount = (computedAmountRupees * coupon.discountValue) / 100;
          }
        }
      }
    }

    // 3. Convert to Paise exactly
    const finalAmountRupees = Math.max(0, computedAmountRupees - discount);
    const amountPaise = Math.round(finalAmountRupees * 100);

    // If order becomes completely free due to coupons, fulfill immediately on backend
    if (amountPaise < 1) {
      if (session?.user?.id) {
        await fulfillOrder({
          userId: session.user.id,
          type,
          ids,
          amountRupees: 0,
        });
      }
      return NextResponse.json({
        orderId: `free_${Date.now()}`,
        amount: 0,
        free: true
      });
    }

    const rzpController = new AbortController();
    const rzpTimer = setTimeout(() => rzpController.abort(), 15_000);
    // Idempotency key = session userId + items hash — prevents double-charge on network retry
    const sessionUserId = (session?.user as { id?: string })?.id ?? "anon";
    const idempotencyKey = `${sessionUserId}-${Buffer.from(JSON.stringify(ids)).toString("base64url").slice(0, 32)}`;
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
