import { NextResponse } from "next/server";
import { auth } from "@/auth";
import crypto from "crypto";
import { getRazorpayCredentials } from "@/lib/razorpay-credentials";
import { fulfillOrder } from "@/lib/order-fulfillment";

export async function POST(request: Request) {
  try {
    const session = await auth();
    const userId = (session?.user as { id?: string })?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, ids, type } = body;

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return NextResponse.json({ error: "Incomplete payment data" }, { status: 400 });
    }

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

    if (expectedSignature !== razorpay_signature) {
      console.warn(`[SECURITY] Invalid Razorpay signature from user ${userId}`);
      return NextResponse.json({ error: "Authenticity verification failed" }, { status: 400 });
    }

    // Fetch the authoritative order amount from Razorpay — never trust the
    // client-supplied `amount`. The signature only binds (orderId, paymentId),
    // not the amount, so without this lookup an attacker could claim they paid
    // ₹0.01 while having paid the real price.
    let amountRupees: number;
    try {
      const orderRes = await fetch(
        `https://api.razorpay.com/v1/orders/${encodeURIComponent(razorpay_order_id)}`,
        {
          headers: {
            Authorization:
              "Basic " +
              Buffer.from(credentials.keyId + ":" + credentials.keySecret).toString("base64"),
          },
        }
      );
      if (!orderRes.ok) {
        console.error("[razorpay/verify] order lookup failed:", orderRes.status);
        return NextResponse.json({ error: "Order verification failed" }, { status: 502 });
      }
      const order = (await orderRes.json()) as { amount: number; status: string };
      amountRupees = order.amount / 100;
    } catch (e) {
      console.error("[razorpay/verify] order lookup error:", e);
      return NextResponse.json({ error: "Order verification failed" }, { status: 502 });
    }

    // Signature is valid and amount comes from Razorpay — fulfill the order.
    const transaction = await fulfillOrder({
      userId,
      type: type as "CART" | "PRODUCT" | "REWARD" | "SUBSCRIPTION",
      ids: ids as string[],
      amountRupees,
      paymentGatewayId: razorpay_payment_id,
    });

    return NextResponse.json({ success: true, transactionId: transaction.transactionId });

  } catch (e) {
    console.error("POST /api/razorpay/verify:", e);
    return NextResponse.json({ error: "Verification process failed" }, { status: 500 });
  }
}
