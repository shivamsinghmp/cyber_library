import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { verifyOtp } from "@/lib/otp";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const rl = rateLimit(`pwd_reset_ip:${ip}`, 10, 900); // 10 per 15 min per IP
    if (!rl.success) {
      return NextResponse.json({ error: "Too many attempts. Thodi der baad try karo." }, { status: 429 });
    }

    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const code = typeof body.code === "string" ? body.code.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    // Per-email OTP brute-force protection
    if (email) {
      const rl2 = rateLimit(`pwd_reset_email:${email}`, 5, 900); // 5 per 15 min per email
      if (!rl2.success) {
        return NextResponse.json({ error: "Too many reset attempts for this account." }, { status: 429 });
      }
    }

    if (!email || !code || !password) {
      return NextResponse.json(
        { error: "Email, code and new password are required" },
        { status: 400 }
      );
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "Invalid code or email" }, { status: 400 });
    }

    const ok = await verifyOtp(email, "reset", code);
    if (!ok) {
      return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });
    }

    const hashed = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { email },
      data: { password: hashed },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("POST /api/auth/forgot-password/reset:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

