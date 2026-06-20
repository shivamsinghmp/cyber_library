import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createStaffSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().optional(),
  accountType: z.enum(["EMPLOYEE", "INFLUENCER"]).optional(),
  commissionRate: z.number().min(0).max(100).optional(),
});

function generateReferralCode(name?: string | null): string {
  const prefix = name
    ? name.replace(/\s+/g, "").toUpperCase().slice(0, 4)
    : "INF";
  const suffix = Math.random().toString(36).toUpperCase().slice(2, 7);
  return `${prefix}${suffix}`;
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    const sessionRole = (session?.user as { role?: string })?.role;
    if (!session?.user || sessionRole !== "ADMIN") {
      return NextResponse.json(
        { error: "Only Admin can create staff. Please log in as Admin." },
        { status: 403 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }
    const parsed = createStaffSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { email, password, name, accountType, commissionRate } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: { email: ["An account with this email already exists."] } },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    if (accountType === "INFLUENCER") {
      // Generate unique referral code
      let referralCode = generateReferralCode(name);
      let attempts = 0;
      while (attempts < 5) {
        const taken = await prisma.user.findUnique({ where: { referralCode } });
        if (!taken) break;
        referralCode = generateReferralCode(name);
        attempts++;
      }

      const user = await prisma.user.create({
        data: {
          email,
          name: name ?? null,
          password: hashedPassword,
          role: "INFLUENCER",
          emailVerified: new Date(),
          referralCode,
        },
      });

      await prisma.influencerProfile.create({
        data: {
          userId: user.id,
          commissionRate: commissionRate ?? 10,
        },
      });

      return NextResponse.json(
        { success: true, message: "Influencer account created.", referralCode },
        { status: 201 }
      );
    }

    await prisma.user.create({
      data: {
        email,
        name: name ?? null,
        password: hashedPassword,
        role: accountType ?? "EMPLOYEE",
        emailVerified: new Date(),
      },
    });

    return NextResponse.json(
      { success: true, message: "Staff account created." },
      { status: 201 }
    );
  } catch (e) {
    console.error("Create staff error:", e);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}
