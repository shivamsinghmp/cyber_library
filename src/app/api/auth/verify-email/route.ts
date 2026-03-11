import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyOtp } from "@/lib/otp";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const code = typeof body.code === "string" ? body.code.trim() : "";
    if (!email || !code) {
      return NextResponse.json({ error: "Email and code are required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "Invalid code or email" }, { status: 400 });
    }

    const ok = await verifyOtp(email, "verify", code);
    if (!ok) {
      return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });
    }

    await prisma.user.update({
      where: { email },
      data: { emailVerified: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("POST /api/auth/verify-email:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

