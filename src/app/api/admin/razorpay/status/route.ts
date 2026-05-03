import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/api-helpers";

/** Returns whether Razorpay is configured (DB or env). No values exposed. */
export async function GET() {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    // auth verified (user identity confirmed by requireSuperAdmin/requireAdmin)
    const row = await prisma.razorpaySetting.findFirst({
      orderBy: { updatedAt: "desc" },
    });
    const fromDb = !!(
      row?.keyId?.trim() &&
      row?.keySecretEncrypted &&
      row?.iv
    );
    if (fromDb) {
      return NextResponse.json({ configured: true, source: "admin" });
    }
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const fromEnv = !!(keyId?.trim() && keySecret?.trim());
    return NextResponse.json({
      configured: fromEnv,
      source: fromEnv ? "env" : null,
    });
  } catch (e) {
    console.error("GET /api/admin/razorpay/status:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
