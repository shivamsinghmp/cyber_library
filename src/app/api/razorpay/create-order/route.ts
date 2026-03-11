import { NextResponse } from "next/server";
import { getRazorpayCredentials } from "@/lib/razorpay-credentials";
import { z } from "zod";

const bodySchema = z.object({
  amount: z.number().min(0), // amount in rupees
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
      return NextResponse.json(
        { error: "Invalid amount" },
        { status: 400 }
      );
    }
    const amountRupees = parsed.data.amount;
    const amountPaise = Math.round(amountRupees * 100);
    if (amountPaise < 1) {
      return NextResponse.json(
        { error: "Amount must be at least ₹0.01" },
        { status: 400 }
      );
    }

    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + Buffer.from(credentials.keyId + ":" + credentials.keySecret).toString("base64"),
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: "INR",
        receipt: "rcpt_" + Date.now(),
      }),
    });

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
