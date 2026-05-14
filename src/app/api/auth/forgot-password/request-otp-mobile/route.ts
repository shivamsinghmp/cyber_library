import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createOtp } from "@/lib/otp";
import { sendSmsOtp } from "@/lib/sms";
import { sendWhatsAppText } from "@/lib/whatsapp";

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  const visible = local.slice(0, 2);
  return `${visible}***@${domain}`;
}

function formatPhone(raw: string): string {
  return raw.startsWith("+") ? raw : `+91${raw.replace(/^0+/, "")}`;
}

export async function POST(request: Request) {
  try {
    const body  = await request.json().catch(() => ({}));
    const rawPhone = typeof body.phoneNumber === "string" ? body.phoneNumber.trim() : "";
    if (!rawPhone || rawPhone.length < 10) {
      return NextResponse.json({ error: "Valid mobile number daalo." }, { status: 400 });
    }

    const phoneNumber = formatPhone(rawPhone);

    // Find user by registered mobile number
    const profile = await prisma.profile.findFirst({
      where: {
        OR: [
          { whatsappNumber: phoneNumber },
          { phone: phoneNumber },
        ],
      },
      include: { user: { select: { id: true, email: true, deletedAt: true } } },
    });

    // Don't reveal if number exists — always return success-looking response
    if (!profile?.user || profile.user.deletedAt) {
      return NextResponse.json({ success: true, maskedEmail: null });
    }

    const email = profile.user.email!;

    // Create reset OTP stored against email (same as email flow — reset route reuses it)
    const code = await createOtp(email, "reset");

    // Send via SMS first, fallback to WhatsApp
    const message = `The Cyber Library Password Reset\n\nOTP: ${code}\n\n10 minute mein expire hoga. Kisi ko mat batao.`;

    let delivered = await sendSmsOtp(phoneNumber, code);
    if (!delivered) {
      delivered = await sendWhatsAppText(phoneNumber, `*The Cyber Library*\n\n${message}`);
    }

    if (!delivered) {
      if (process.env.NODE_ENV !== "production") {
        console.log(`\nDEV mobile reset OTP for ${phoneNumber} (email: ${email}): ${code}\n`);
        return NextResponse.json({ success: true, maskedEmail: maskEmail(email) });
      }
      return NextResponse.json({ error: "OTP deliver nahi hua. Number check karo ya baad mein try karo." }, { status: 502 });
    }

    return NextResponse.json({ success: true, maskedEmail: maskEmail(email) });
  } catch (e) {
    console.error("POST /api/auth/forgot-password/request-otp-mobile:", e);
    return NextResponse.json({ error: "Kuch gadbad ho gayi." }, { status: 500 });
  }
}
