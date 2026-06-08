import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createOtp } from "@/lib/otp";
import { sendOtpEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const rl = rateLimit(`forgot_otp_ip:${ip}`, 5, 300); // 5 per 5 min per IP
    if (!rl.success) {
      return NextResponse.json({ error: "Too many attempts. Please try again in 5 minutes." }, { status: 429 });
    }

    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Per-email rate limit (prevent targeted spam)
    const rl2 = rateLimit(`forgot_otp_email:${email}`, 3, 600); // 3 per 10 min per email
    if (!rl2.success) {
      return NextResponse.json({ error: "Too many requests for this email." }, { status: 429 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Do not reveal if email exists; respond success anyway
      return NextResponse.json({ success: true });
    }

    try {
      const code = await createOtp(email, "reset");
      const sent = await sendOtpEmail(email, code, "reset");
      if (!sent) {
        return NextResponse.json(
          { error: "Could not send OTP email. Please try again later." },
          { status: 500 }
        );
      }
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

