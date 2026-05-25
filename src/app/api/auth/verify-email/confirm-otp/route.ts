import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { verifyOtp } from "@/lib/otp";
import { z } from "zod";

const bodySchema = z.object({
  code: z.string().length(6, "OTP 6 digits ka hona chahiye"),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    const userId = (session?.user as { id?: string })?.id;
    if (!userId) {
      return NextResponse.json({ error: "Login karo pehle." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid OTP" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, emailVerified: true },
    });

    if (!user?.email) {
      return NextResponse.json({ error: "Email not found." }, { status: 400 });
    }

    if (user.emailVerified) {
      return NextResponse.json({ success: true, alreadyVerified: true });
    }

    const ok = await verifyOtp(user.email, "verify", parsed.data.code);
    if (!ok) {
      return NextResponse.json({ error: "OTP galat hai ya expire ho gaya. Naya OTP mangao." }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("POST /api/auth/verify-email/confirm-otp:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
