import { NextResponse } from "next/server";
import { auth } from "@/auth";
import crypto from "crypto";
import { z } from "zod";
import { getRazorpayCredentials } from "@/lib/razorpay-credentials";
import { fulfillOrder } from "@/lib/order-fulfillment";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const session = await auth();
    const userId = (session?.user as { id?: string })?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const verifySchema = z.object({
      razorpay_payment_id: z.string().min(1),
      razorpay_order_id:   z.string().min(1),
      razorpay_signature:  z.string().min(1),
      type: z.enum(["CART", "PRODUCT", "REWARD", "SUBSCRIPTION", "COIN_PACK"]),
      ids:  z.array(z.string()).min(1),
      couponCode: z.string().optional(),
    }).refine(
      (d) => d.type !== "SUBSCRIPTION" || ["MONTHLY", "YEARLY"].includes(d.ids[0]),
      { message: "Invalid subscription plan type", path: ["ids"] }
    );

    const parsed = verifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Incomplete payment data" }, { status: 400 });
    }

    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, ids, type, couponCode } = parsed.data;

    const credentials = await getRazorpayCredentials();
    if (!credentials || !credentials.keySecret) {
      return NextResponse.json({ error: "Payment gateway misconfigured" }, { status: 500 });
    }

    // Cryptographic verification
    const bodyString = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", credentials.keySecret)
      .update(bodyString)
      .digest("hex");

    // Constant-time comparison — prevents timing oracle attacks (CWE-208)
    const expectedBuf = Buffer.from(expectedSignature, "hex");
    const receivedBuf = Buffer.from(razorpay_signature, "hex");
    const sigValid =
      expectedBuf.length === receivedBuf.length &&
      crypto.timingSafeEqual(expectedBuf, receivedBuf);
    if (!sigValid) {
      console.warn(`[SECURITY] Invalid Razorpay signature from user ${userId}`);
      return NextResponse.json({ error: "Authenticity verification failed" }, { status: 400 });
    }

    // Idempotency: if this payment was already fulfilled, return the existing transaction
    const existingTxn = await prisma.transaction.findFirst({
      where: { paymentGatewayId: razorpay_payment_id },
      select: { transactionId: true },
    });
    if (existingTxn) {
      return NextResponse.json({ success: true, transactionId: existingTxn.transactionId });
    }

    // Fetch the authoritative order amount from Razorpay — never trust the
    // client-supplied `amount`. The signature only binds (orderId, paymentId),
    // not the amount, so without this lookup an attacker could claim they paid
    // ₹0.01 while having paid the real price.
    let amountRupees: number;
    try {
      const rzpController = new AbortController();
      const rzpTimer = setTimeout(() => rzpController.abort(), 15_000);
      const orderRes = await fetch(
        `https://api.razorpay.com/v1/orders/${encodeURIComponent(razorpay_order_id)}`,
        {
          signal: rzpController.signal,
          headers: {
            Authorization:
              "Basic " +
              Buffer.from(credentials.keyId + ":" + credentials.keySecret).toString("base64"),
          },
        }
      ).finally(() => clearTimeout(rzpTimer));
      if (!orderRes.ok) {
        console.error("[razorpay/verify] order lookup failed:", orderRes.status);
        return NextResponse.json({ error: "Order verification failed" }, { status: 502 });
      }
      const order = (await orderRes.json()) as {
        amount: number;
        status: string;
        notes?: Record<string, string>;
      };
      amountRupees = order.amount / 100;

      // Verify purchase intent: prevent order substitution attacks.
      // notes.type and notes.ids_hash were stored by /api/razorpay/create-order
      // on Razorpay's servers — they cannot be tampered by the client.
      if (order.notes?.type || order.notes?.ids_hash) {
        if (order.notes.type && order.notes.type !== type) {
          console.warn(`[SECURITY] Razorpay order type mismatch — order: ${order.notes.type}, claimed: ${type}, userId: ${userId}`);
          return NextResponse.json({ error: "Order verification failed" }, { status: 400 });
        }
        if (order.notes.ids_hash) {
          const expectedHash = crypto
            .createHash("sha256")
            .update(JSON.stringify([...ids].sort()))
            .digest("hex")
            .slice(0, 32);
          if (order.notes.ids_hash !== expectedHash) {
            console.warn(`[SECURITY] Razorpay order items mismatch — userId: ${userId}, orderId: ${razorpay_order_id}`);
            return NextResponse.json({ error: "Order verification failed" }, { status: 400 });
          }
        }
      }
    } catch (e) {
      console.error("[razorpay/verify] order lookup error:", e);
      return NextResponse.json({ error: "Order verification failed" }, { status: 502 });
    }

    // Signature is valid and amount comes from Razorpay — fulfill the order.
    try {
      const transaction = await fulfillOrder({
        userId,
        type,
        ids,
        amountRupees,
        paymentGatewayId: razorpay_payment_id,
        couponCode: couponCode || undefined,
      });
      return NextResponse.json({ success: true, transactionId: transaction.transactionId });
    } catch (fulfillErr) {
      // ALREADY_SUBSCRIBED — user paid but already has an active subscription (race condition)
      if (fulfillErr instanceof Error && fulfillErr.message === "ALREADY_SUBSCRIBED") {
        return NextResponse.json({ error: "Aapka subscription already active hai." }, { status: 409 });
      }
      // P2002 = unique constraint violation — concurrent webhook fired simultaneously,
      // the first call already fulfilled this payment. Return success idempotently.
      if (fulfillErr && typeof fulfillErr === "object" && "code" in fulfillErr && (fulfillErr as { code: string }).code === "P2002") {
        const existing = await prisma.transaction.findFirst({
          where: { paymentGatewayId: razorpay_payment_id },
          select: { transactionId: true },
        });
        if (existing) {
          return NextResponse.json({ success: true, transactionId: existing.transactionId });
        }
      }
      throw fulfillErr;
    }

  } catch (e) {
    console.error("POST /api/razorpay/verify:", e);
    return NextResponse.json({ error: "Verification process failed" }, { status: 500 });
  }
}
