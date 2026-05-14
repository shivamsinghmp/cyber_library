import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendSmsOtp } from "@/lib/sms";
import { sendWhatsAppText } from "@/lib/whatsapp";
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

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.whatsAppOTP.deleteMany({ where: { phoneNumber } });
    await prisma.whatsAppOTP.create({ data: { phoneNumber, otp, expiresAt } });

    // Primary: Fast2SMS SMS
    let delivered = await sendSmsOtp(phoneNumber, otp);

    // Fallback: WhatsApp
    if (!delivered) {
      const msg = `*The Cyber Library Verification*\n\nYour OTP is: *${otp}*\n\nExpires in 10 minutes. Do not share it.`;
      delivered = await sendWhatsAppText(phoneNumber, msg);
    }

    if (!delivered) {
      if (process.env.NODE_ENV !== "production") {
        console.log(`\nDEV OTP for ${phoneNumber}: ${otp}\n`);
        return NextResponse.json({ ok: true, message: "OTP logged to server console (dev mode)" });
      }
      return NextResponse.json(
        { error: "Could not deliver OTP. Please check the number or try later." },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, message: "OTP sent successfully" });
  } catch (e) {
    console.error("POST /api/auth/whatsapp-otp/send:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
