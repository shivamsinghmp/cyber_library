import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createMagicLinkToken } from "@/lib/magic-link";
import { sendMagicLinkEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "No account found for this email" }, { status: 404 });
    }

    if (user.emailVerified) {
      return NextResponse.json({ success: true, alreadyVerified: true });
    }

    // Use env var — never the request Host header (prevents phishing via forged Host)
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://cyberlib.in";

    const token = await createMagicLinkToken(email);
    const verifyUrl = `${baseUrl}/verify-email/confirm?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;

    await sendMagicLinkEmail(email, verifyUrl, user.name);

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("POST /api/auth/verify-email/resend:", e);
    return NextResponse.json({ error: "Failed to send verification link. Try again later." }, { status: 500 });
  }
}
