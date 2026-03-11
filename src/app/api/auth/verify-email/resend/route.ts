import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createOtp } from "@/lib/otp";
import { sendOtpEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "No account found for this email" }, { status: 404 });
    }

    try {
      const code = await createOtp(email, "verify");
      await sendOtpEmail(email, code, "verify");
    } catch (e) {
      console.error("Failed to resend verification OTP:", e);
      return NextResponse.json(
        { error: "Could not send verification code. Try again later." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("POST /api/auth/verify-email/resend:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

