import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { verifyOtp } from "@/lib/otp";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const code = typeof body.code === "string" ? body.code.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

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

