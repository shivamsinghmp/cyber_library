import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createOtp } from "@/lib/otp";
import { sendOtpEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";

export async function POST() {
  try {
    const session = await auth();
    const userId = (session?.user as { id?: string })?.id;
    if (!userId) {
      return NextResponse.json({ error: "Please log in first." }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, emailVerified: true, name: true },
    });

    if (!user?.email) {
      return NextResponse.json({ error: "Email not found." }, { status: 400 });
    }

    if (user.emailVerified) {
      return NextResponse.json({ success: true, alreadyVerified: true });
    }

    const rl = rateLimit(`email_verify_otp:${userId}`, 3, 600);
    if (!rl.success) {
      return NextResponse.json({ error: "Too many requests. Please try again in 10 minutes." }, { status: 429 });
    }

    const code = await createOtp(user.email, "verify");
    const sent = await sendOtpEmail(user.email, code, "verify", user.name ?? undefined);

    if (!sent) {
      return NextResponse.json({ error: "Could not send OTP. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("POST /api/auth/verify-email/send-otp:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
