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
      // Do not reveal if email exists; respond success anyway
      return NextResponse.json({ success: true });
    }

    try {
      const code = await createOtp(email, "reset");
      await sendOtpEmail(email, code, "reset");
    } catch (e) {
      console.error("Failed to send reset OTP:", e);
      return NextResponse.json(
        { error: "Could not send code. Try again later." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("POST /api/auth/forgot-password/request-otp:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

