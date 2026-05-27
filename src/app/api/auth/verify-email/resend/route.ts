import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createOtp } from "@/lib/otp";
import { sendOtpEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, emailVerified: true },
    });

    if (!user) {
      return NextResponse.json({ error: "No account found for this email" }, { status: 404 });
    }

    if (user.emailVerified) {
      return NextResponse.json({ success: true, alreadyVerified: true });
    }

    const rl = rateLimit(`email_verify_resend:${email}`, 3, 600);
    if (!rl.success) {
      return NextResponse.json({ error: "Bahut zyada requests. 10 minute baad try karo." }, { status: 429 });
    }

    const code = await createOtp(email, "verify");
    const sent = await sendOtpEmail(email, code, "verify", user.name);

    if (!sent) {
      return NextResponse.json({ error: "OTP nahi bheja ja saka. Dobara try karo." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("POST /api/auth/verify-email/resend:", e);
    return NextResponse.json({ error: "Failed to send OTP. Try again later." }, { status: 500 });
  }
}
