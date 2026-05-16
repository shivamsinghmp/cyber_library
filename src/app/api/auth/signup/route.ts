import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { generateStudentId } from "@/lib/studentId";
import { createMagicLinkToken } from "@/lib/magic-link";
import { sendMagicLinkEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";

const signupSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(72, "Password too long"),
  goal: z.string().min(1, "Study goal is required").max(100),
  whatsappNumber: z.string().min(10, "Valid WhatsApp number is required").max(20),
  otp: z.string().length(6, "OTP must be 6 digits"),
});

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const rl = rateLimit(`signup_ip:${ip}`, 5, 3600); // 5 signups per IP per hour
    if (!rl.success) {
      return NextResponse.json({ error: "Too many signup attempts. 1 hour baad try karo." }, { status: 429 });
    }

    const body = await request.json();
    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { name, email, password, goal, whatsappNumber, otp } = parsed.data;
    const refCode =
      typeof body.ref === "string" && body.ref.trim().length > 0
        ? body.ref.trim()
        : undefined;

    // Parallel validation checks + hash + studentId generation
    const [existingUser, existingProfile, otpRecord, refUser, hashedPassword, studentId] = await Promise.all([
      prisma.user.findUnique({ where: { email }, select: { id: true } }),
      prisma.profile.findFirst({
        where: { OR: [{ whatsappNumber }, { phone: whatsappNumber }] },
        select: { id: true },
      }),
      prisma.whatsAppOTP.findFirst({
        where: { phoneNumber: whatsappNumber },
        orderBy: { expiresAt: "desc" },
        select: { otp: true, verified: true, expiresAt: true },
      }),
      refCode
        ? prisma.user.findFirst({ where: { referralCode: refCode, deletedAt: null }, select: { id: true } })
        : Promise.resolve(null),
      bcrypt.hash(password, 12),
      generateStudentId(),
    ]);

    if (existingUser) {
      return NextResponse.json(
        { error: { email: ["An account with this email already exists."] } },
        { status: 409 }
      );
    }
    if (existingProfile) {
      return NextResponse.json(
        { error: { whatsappNumber: ["This number cannot be used for registration."] } },
        { status: 409 }
      );
    }
    if (!otpRecord || otpRecord.otp !== otp || !otpRecord.verified || otpRecord.expiresAt < new Date()) {
      return NextResponse.json(
        { error: { otp: ["Invalid or expired OTP. Please verify your number first."] } },
        { status: 400 }
      );
    }

    const referredById = refUser?.id ?? null;

    await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        goal,
        role: "STUDENT",
        studentId,
        referredById: referredById ?? undefined,
        profile: {
          create: {
            fullName: name,
            studyGoal: goal,
            whatsappNumber,
            phone: whatsappNumber,
          },
        },
      },
    });

    // Cleanup used OTP
    await prisma.whatsAppOTP.deleteMany({ where: { phoneNumber: whatsappNumber } });

    // Send magic link for email verification (fire-and-forget)
    try {
      const host = request.headers.get("host") ?? "cyberlib.in";
      const proto = host.startsWith("localhost") ? "http" : "https";
      const baseUrl = `${proto}://${host}`;
      const token = await createMagicLinkToken(email);
      const verifyUrl = `${baseUrl}/verify-email/confirm?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
      sendMagicLinkEmail(email, verifyUrl, name).catch(console.error);
    } catch (e) {
      console.error("Failed to send magic link after signup:", e);
    }

    return NextResponse.json(
      { success: true, email },
      { status: 201 }
    );
  } catch (e) {
    console.error("Signup error:", e);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

