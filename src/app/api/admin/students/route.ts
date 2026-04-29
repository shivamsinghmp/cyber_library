import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateStudentId } from "@/lib/studentId";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/api-helpers";

const createStudentSchema = z.object({
  email: z.string().email("Invalid email").max(255),
  // Password bounded to 72 bytes to prevent Bcrypt processing DOS
  password: z.string().min(8, "Password must be at least 8 characters").max(72, "Password too long"),
  name: z.string().max(100).optional(),
  goal: z.string().max(100).optional(),
});

export async function GET(request: Request) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    const { user } = auth;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    // Vulnerability Fix: Enforce pagination offset limit to prevent Denial of Service Memory Spikes
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const take = 50; 
    const skip = (page - 1) * take;

    const students = await prisma.user.findMany({
      where: {
        role: "STUDENT",
        deletedAt: null,
        ...(search
          ? {
              OR: [
                { studentId: { contains: search, mode: "insensitive" } },
                { id: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
                { name: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        studentId: true,
        name: true,
        email: true,
        goal: true,
        createdAt: true,
        profile: {
          select: {
            phone: true,
            whatsappNumber: true,
            studyGoal: true,
            targetExam: true,
            totalStudyHours: true,
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take,
      skip,
    });

    const result: typeof students = [];
    for (const s of students) {
      if (s.studentId) {
        result.push(s);
        continue;
      }
      const newId = await generateStudentId();
      await prisma.user.update({
        where: { id: s.id },
        data: { studentId: newId },
      });
      result.push({ ...s, studentId: newId });
    }

    return NextResponse.json(result);
  } catch (e) {
    console.error("GET /api/admin/students:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

/** POST: Create a new student account (admin only) */
export async function POST(request: Request) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    const { user } = auth;

    const body = await request.json();
    const parsed = createStudentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { email, password, name, goal } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const studentId = await generateStudentId();
    const user = await prisma.user.create({
      data: {
        email,
        name: name ?? null,
        password: hashedPassword,
        goal: goal ?? null,
        role: "STUDENT",
        studentId,
      },
      select: {
        id: true,
        studentId: true,
        name: true,
        email: true,
        goal: true,
        createdAt: true,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (e) {
    console.error("POST /api/admin/students:", e);
    return NextResponse.json({ error: "Failed to create student." }, { status: 500 });
  }
}
