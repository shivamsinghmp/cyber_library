import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { auditLog } from "@/lib/auditLog";
import { passwordSchema } from "@/lib/password-schema";

const signupSchema = z.object({
  name:     z.string().min(1, "Name is required").max(100),
  email:    z.string().email("Invalid email").max(255),
  password: passwordSchema,
});

// Self-registration for staff.lstudy.in — creates an EMPLOYEE account that
// starts PENDING. It cannot log in (see packages/shared/auth.ts's authorize())
// until an admin approves it from portal.lstudy.in's /admin/staff page.
export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const rl = rateLimit(`staff_signup_ip:${ip}`, 5, 3600);
    if (!rl.success) {
      return NextResponse.json({ error: "Too many signup attempts. Please try again in 1 hour." }, { status: 429 });
    }

    const body = await request.json();
    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const { name, email, password } = parsed.data;

    const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existingUser) {
      return NextResponse.json(
        { error: { email: ["This email is already registered."] } },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "EMPLOYEE",
        employeeStatus: "PENDING",
      },
      select: { id: true },
    });

    auditLog("signup", request, { userId: newUser.id, role: "EMPLOYEE" });

    return NextResponse.json({ success: true, email }, { status: 201 });
  } catch (e) {
    console.error("Staff signup error:", e);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
