import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppText } from "@/lib/whatsapp";
import { z } from "zod";

const otpRequestSchema = z.object({
  phoneNumber: z.string().min(10, "Invalid phone number"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = otpRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
    }

    const { phoneNumber } = parsed.data;

    // Check if user already exists
    const existingProfile = await prisma.profile.findFirst({
       where: {
         OR: [
           { whatsappNumber: phoneNumber },
           { phone: phoneNumber }
         ]
       }
    });

    if (existingProfile) {
      return NextResponse.json({ error: "This mobile number is already registered to another account." }, { status: 409 });
    }

    // Generate a secure 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Expire in 10 minutes
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Save or update existing OTP record for this number
    await prisma.whatsAppOTP.deleteMany({
      where: { phoneNumber }
    });

    await prisma.whatsAppOTP.create({
      data: {
         phoneNumber,
         otp,
         expiresAt,
      }
    });

    // Send the WhatsApp Message
    const textMessage = `*The Cyber Library Verification*\n\nYour secret code is: *${otp}*\n\nThis code will expire in 10 minutes. Do not share it.`;
    
    // We do not wait for true API response to avoid blocking if the API is slow, 
    // but in a production environment with approved Template we want to know if it failed.
    const success = await sendWhatsAppText(phoneNumber, textMessage);

    if (!success && !process.env.WHATSAPP_PHONE_NUMBER_ID) {
      if (process.env.NODE_ENV !== "production") {
        console.log("\n==============================");
        console.log(`DEV MODE OTP FOR ${phoneNumber}: ${otp}`);
        console.log("==============================\n");
      }
      // Bypass the 502 error during local development without keys
      return NextResponse.json({ ok: true, message: "OTP bypassed to server console for testing" });
    } else if (!success) {
      return NextResponse.json({ error: "Failed to deliver WhatsApp message. Please check the number or try later." }, { status: 502 });
    }

    return NextResponse.json({ ok: true, message: "OTP sent successfully" });

  } catch (e) {
    console.error("POST /api/auth/whatsapp-otp/send error:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
