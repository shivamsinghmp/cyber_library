import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMagicLinkToken } from "@/lib/magic-link";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const token = typeof body.token === "string" ? body.token.trim() : "";

    if (!email || !token) {
      return NextResponse.json({ error: "Email and token are required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "Invalid link" }, { status: 400 });
    }

    if (user.emailVerified) {
      return NextResponse.json({ success: true, alreadyVerified: true });
    }

    const ok = await verifyMagicLinkToken(email, token);
    if (!ok) {
      return NextResponse.json({ error: "Link is invalid or has expired. Request a new one." }, { status: 400 });
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
