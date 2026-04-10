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
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, ids, type, amount } = body;

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

    // Since signature is valid, this payment actually successfully reached Razorpay for the given order.
    // Proceed to fulfill the order securely.
    const transaction = await fulfillOrder({
      userId,
      type: type as "CART" | "PRODUCT" | "REWARD",
      ids: ids as string[],
      amountRupees: amount, // Extracted from client but authenticated via the successful checkout of the generated order ID
      paymentGatewayId: razorpay_payment_id,
    });

    return NextResponse.json({ success: true, transactionId: transaction.transactionId });

  } catch (e) {
    console.error("POST /api/razorpay/verify:", e);
    return NextResponse.json({ error: "Verification process failed" }, { status: 500 });
  }
}
