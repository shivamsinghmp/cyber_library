import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/api-helpers";

/** GET: Returns whether Razorpay keys are set in .env (never exposes the actual values). */
export async function GET() {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;

    const keyId     = process.env.RAZORPAY_KEY_ID?.trim() || null;
    const hasSecret = !!process.env.RAZORPAY_KEY_SECRET?.trim();

    return NextResponse.json({
      keyId,
      hasSecret,
      configured: !!(keyId && hasSecret),
      source: "env",
    });
  } catch (e) {
    console.error("GET /api/admin/razorpay/settings:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
