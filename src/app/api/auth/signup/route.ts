import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { generateStudentId } from "@/lib/studentId";
import { generateStudentReferralCode } from "@/lib/referral";
import { rateLimit } from "@/lib/rate-limit";
import { auditLog } from "@/lib/auditLog";
import { passwordSchema } from "@/lib/password-schema";

const signupSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email").max(255),
  password: passwordSchema,
  goal: z.string().min(1, "Study goal is required").max(100),
  whatsappNumber: z.string().min(10, "Valid WhatsApp number is required").max(20),
  otp: z.string().length(6, "OTP must be 6 digits"),
  whatsappMarketing: z.boolean().optional().default(true),
});

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const rl = rateLimit(`signup_ip:${ip}`, 5, 3600); // 5 signups per IP per hour
    if (!rl.success) {
      return NextResponse.json({ error: "Too many signup attempts. Please try again in 1 hour." }, { status: 429 });
    }

    const body = await request.json();
    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { name, email, password, goal, whatsappNumber, otp, whatsappMarketing } = parsed.data;
    const rawRef = typeof body.ref === "string" ? body.ref.trim() : "";
    const refCode = rawRef.length > 0 && rawRef.length <= 20 && /^[a-zA-Z0-9_-]+$/.test(rawRef)
      ? rawRef
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
        { error: { email: ["This email is already registered. Please log in or use a different email."] } },
        { status: 409 }
      );
    }
    if (existingProfile) {
      return NextResponse.json(
        { error: { whatsappNumber: ["This mobile number is already registered. Please log in or use a different number."] } },
        { status: 409 }
      );
    }
    if (!otpRecord || !otpRecord.verified || otpRecord.expiresAt < new Date()) {
      return NextResponse.json(
        { error: { otp: ["Invalid or expired OTP. Please verify your number first."] } },
        { status: 400 }
      );
    }

    const referredById = refUser?.id ?? null;

    const newUser = await prisma.user.create({
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
            whatsappMarketing,
          },
        },
      },
      select: { id: true },
    });

    // Auto-generate referral code at registration (non-blocking — never fails signup)
    generateStudentReferralCode(newUser.id).catch(() => {});

    // Security audit log (fire-and-forget)
    auditLog("signup", request, { userId: newUser.id, goal });

    // Send WhatsApp welcome message (fire-and-forget — never blocks signup response)
    if (whatsappNumber) {
      const { sendWelcomeMessage } = await import("@/lib/whatsapp");
      sendWelcomeMessage({ phone: whatsappNumber, name, studentId }).catch(() => {});
    }

    // Cleanup used OTP
    await prisma.whatsAppOTP.deleteMany({ where: { phoneNumber: whatsappNumber } });

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

