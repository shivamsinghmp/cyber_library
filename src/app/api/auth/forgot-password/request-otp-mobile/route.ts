import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createOtp } from "@/lib/otp";
import { sendWhatsAppOtp } from "@/lib/whatsapp";
import { rateLimit } from "@/lib/rate-limit";

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
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const rl = rateLimit(`forgot_mobile_ip:${ip}`, 5, 300); // 5 per 5 min per IP
    if (!rl.success) {
      return NextResponse.json({ error: "Too many attempts. 5 minute baad try karo." }, { status: 429 });
    }

    const body = await request.json().catch(() => ({}));
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

    // Create reset OTP stored against email
    const code = await createOtp(email, "reset");

    const wamid = await sendWhatsAppOtp(phoneNumber, code);

    if (!wamid) {
      if (process.env.NODE_ENV !== "production") {
        console.log(`\n[DEV] Mobile reset OTP for ${phoneNumber} (${email}): ${code}\n`);
        return NextResponse.json({ success: true, maskedEmail: maskEmail(email), resetEmail: email });
      }
      return NextResponse.json(
        { error: "OTP deliver nahi hua. Number check karo ya baad mein try karo." },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, maskedEmail: maskEmail(email), resetEmail: email });
  } catch (e) {
    console.error("POST /api/auth/forgot-password/request-otp-mobile:", e);
    return NextResponse.json({ error: "Kuch gadbad ho gayi." }, { status: 500 });
  }
}
