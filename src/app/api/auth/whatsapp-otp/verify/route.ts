import { NextResponse } from "next/server";
import { headers } from "next/headers";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const schema = z.object({
  phoneNumber: z.string().min(10),
  otp: z.string().length(6),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { phoneNumber, otp } = parsed.data;

    // Per-phone brute-force protection: 5 attempts / 10 min
    const phoneRl = rateLimit(`wa-otp-verify:${phoneNumber}`, 5, 600);
    if (!phoneRl.success) {
      // Burn the active OTP record so an attacker who exhausts attempts
      // cannot keep guessing across windows.
      await prisma.whatsAppOTP.deleteMany({ where: { phoneNumber } });
      return NextResponse.json(
        { error: "Too many attempts. Please request a new OTP." },
        { status: 429 }
      );
    }

    // Per-IP brute-force protection: 20 attempts / 10 min
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const ipRl = rateLimit(`wa-otp-verify-ip:${ip}`, 20, 600);
    if (!ipRl.success) {
      return NextResponse.json(
        { error: "Too many requests from this device." },
        { status: 429 }
      );
    }

    const record = await prisma.whatsAppOTP.findFirst({
      where: { phoneNumber },
      orderBy: { expiresAt: "desc" },
    });

    if (!record) {
      return NextResponse.json({ error: "No OTP found. Please request a new one." }, { status: 400 });
    }

    if (record.expiresAt < new Date()) {
      await prisma.whatsAppOTP.deleteMany({ where: { phoneNumber } });
      return NextResponse.json({ error: "OTP has expired. Please request a new one." }, { status: 400 });
    }

    const ok = await bcrypt.compare(otp, record.otp);
    if (!ok) {
      return NextResponse.json({ error: "Incorrect OTP. Please try again." }, { status: 400 });
    }

    // Mark as verified (signup route will clean up after account creation)
    await prisma.whatsAppOTP.update({
      where: { id: record.id },
      data: { verified: true },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/auth/whatsapp-otp/verify:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
