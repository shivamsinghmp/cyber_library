import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { generateStudentId } from "@/lib/studentId";

const signupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  goal: z.string().min(1, "Study goal is required"),
  whatsappNumber: z.string().min(10, "Valid WhatsApp number is required"),
  // OTP temporarily disabled for signup
  otp: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { name, email, password, goal, whatsappNumber } = parsed.data;
    const refCode =
      typeof body.ref === "string" && body.ref.trim().length > 0
        ? body.ref.trim()
        : undefined;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: { email: ["An account with this email already exists."] } },
        { status: 409 }
      );
    }

    const existingProfile = await prisma.profile.findFirst({
      where: {
        OR: [{ whatsappNumber }, { phone: whatsappNumber }],
      },
    });
    if (existingProfile) {
      return NextResponse.json(
        { error: { whatsappNumber: ["This WhatsApp number is already registered."] } },
        { status: 409 }
      );
    }

    // OTP verification is temporarily disabled for signup.

    const hashedPassword = await bcrypt.hash(password, 12);
    const studentId = await generateStudentId();

    let referredById: string | null = null;
    if (refCode) {
      const refUser = await prisma.user.findFirst({
        where: { referralCode: refCode, deletedAt: null },
        select: { id: true },
      });
      if (refUser) {
        referredById = refUser.id;
      }
    }

    await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        goal,
        role: "STUDENT",
        studentId,
        referredById: referredById ?? undefined,
        emailVerified: new Date(),
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

