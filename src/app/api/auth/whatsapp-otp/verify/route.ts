import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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

    if (record.otp !== otp) {
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
