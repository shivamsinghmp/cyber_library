import { NextResponse } from "next/server";
import { headers } from "next/headers";
import bcrypt from "bcrypt";
import { randomInt } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppOtp } from "@/lib/whatsapp";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const schema = z.object({
  phoneNumber: z.string().min(10, "Invalid phone number"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
    }

    const { phoneNumber } = parsed.data;

    // Rate limit: max 3 OTPs per phone per 10 minutes
    const phoneRl = rateLimit(`wa-otp:${phoneNumber}`, 3, 600);
    if (!phoneRl.success) {
      return NextResponse.json(
        { error: "Too many OTP requests. Please wait before requesting again." },
        { status: 429 }
      );
    }

    // Rate limit: max 10 OTPs per IP per 10 minutes
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const ipRl = rateLimit(`wa-otp-ip:${ip}`, 10, 600);
    if (!ipRl.success) {
      return NextResponse.json(
        { error: "Too many requests from this device." },
        { status: 429 }
      );
    }

    const existingProfile = await prisma.profile.findFirst({
      where: {
        OR: [{ whatsappNumber: phoneNumber }, { phone: phoneNumber }],
      },
    });

    if (existingProfile) {
      return NextResponse.json(
        { error: "This mobile number is already registered to another account." },
        { status: 409 }
      );
    }

    const otp = String(randomInt(100000, 1000000));
    const hashedOtp = await bcrypt.hash(otp, 12);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.whatsAppOTP.deleteMany({ where: { phoneNumber } });
    await prisma.whatsAppOTP.create({ data: { phoneNumber, otp: hashedOtp, expiresAt } });

    const wamid = await sendWhatsAppOtp(phoneNumber, otp);

    // Dev: always log OTP to terminal (WhatsApp delivery unreliable on test accounts)
    if (process.env.NODE_ENV !== "production") {
      console.log(`\n=============================`);
      console.log(`[DEV] WhatsApp OTP`);
      console.log(`Phone  : ${phoneNumber}`);
      console.log(`OTP    : ${otp}`);
      console.log(`=============================\n`);
    }

    if (!wamid && process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "OTP deliver nahi hua. Number check karo ya baad mein try karo." },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, message: "OTP sent via WhatsApp", wamid });
  } catch (e) {
    console.error("POST /api/auth/whatsapp-otp/send:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
