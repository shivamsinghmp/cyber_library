import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyOtp } from "@/lib/otp";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const bodySchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

    // 10 attempts per IP per 15 minutes — brute-force protection for 6-digit OTP
    const ipRl = rateLimit(`verify_email_ip:${ip}`, 10, 900);
    if (!ipRl.success) {
      return NextResponse.json({ error: "Too many attempts. 15 minute baad try karo." }, { status: 429 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Email aur 6-digit OTP zaroori hai." }, { status: 400 });
    }

    const { email, code } = parsed.data;
    const normalizedEmail = email.trim().toLowerCase();

    // 5 attempts per email per 15 minutes — prevents targeted OTP brute-force
    const emailRl = rateLimit(`verify_email_addr:${normalizedEmail}`, 5, 900);
    if (!emailRl.success) {
      return NextResponse.json({ error: "Too many attempts for this email. 15 minute baad try karo." }, { status: 429 });
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, emailVerified: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Account nahi mila." }, { status: 404 });
    }

    if (user.emailVerified) {
      return NextResponse.json({ success: true, alreadyVerified: true });
    }

    const ok = await verifyOtp(normalizedEmail, "verify", code);
    if (!ok) {
      return NextResponse.json({ error: "OTP galat hai ya expire ho gaya. Naya OTP mangao." }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("POST /api/auth/verify-email:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
