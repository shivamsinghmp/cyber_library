import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateStudentSchema = z.object({
  name: z.string().optional(),
  email: z.string().email("Invalid email").optional(),
  goal: z.string().optional().nullable(),
  newPassword: z.string().min(8, "Password must be at least 8 characters").optional(),
});

/** GET: Get single student details (admin only) */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const role = (session?.user as { role?: string })?.role;
    if (!session?.user || role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const [user, sessions] = await Promise.all([
      prisma.user.findFirst({
        where: { id, role: "STUDENT", deletedAt: null },
        include: { profile: true },
      }),
      prisma.studySession.findMany({
        where: { userId: id, durationMinutes: { not: null } },
        select: { startedAt: true, durationMinutes: true },
      }),
    ]);
    if (!user) {
      return NextResponse.json({ error: "Student not found." }, { status: 404 });
    }

    const minutesByDate: Record<string, number> = {};
    for (const s of sessions) {
      const key = new Date(s.startedAt).toISOString().slice(0, 10);
      minutesByDate[key] = (minutesByDate[key] ?? 0) + (s.durationMinutes ?? 0);
    }
    const attendanceDays = Object.values(minutesByDate).filter(
      (mins) => mins >= 30
    ).length;

    const { password: _, ...safe } = user;
    return NextResponse.json({ ...safe, attendanceDays });
  } catch (e) {
    console.error("GET /api/admin/students/[id]:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

/** PUT: Update student (admin only) */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const role = (session?.user as { role?: string })?.role;
    if (!session?.user || role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.user.findFirst({
      where: { id, role: "STUDENT", deletedAt: null },
    });
    if (!existing) {
      return NextResponse.json({ error: "Student not found." }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateStudentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data: { name?: string; email?: string; goal?: string | null; password?: string } = {};
    if (parsed.data.name !== undefined) data.name = parsed.data.name;
    if (parsed.data.email !== undefined) data.email = parsed.data.email;
    if (parsed.data.goal !== undefined) data.goal = parsed.data.goal;
    if (parsed.data.newPassword) {
      data.password = await bcrypt.hash(parsed.data.newPassword, 12);
    }

    if (data.email && data.email !== existing.email) {
      const emailTaken = await prisma.user.findUnique({ where: { email: data.email } });
      if (emailTaken) {
        return NextResponse.json(
          { error: "An account with this email already exists." },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        studentId: true,
        name: true,
        email: true,
        goal: true,
        createdAt: true,
      },
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error("PUT /api/admin/students/[id]:", e);
    return NextResponse.json({ error: "Failed to update student." }, { status: 500 });
  }
}

/** DELETE: Soft-delete student (move to bin); permanent after 30 days if not restored */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const role = (session?.user as { role?: string })?.role;
    if (!session?.user || role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.user.findFirst({
      where: { id, role: "STUDENT", deletedAt: null },
    });
    if (!existing) {
      return NextResponse.json({ error: "Student not found." }, { status: 404 });
    }

    await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/admin/students/[id]:", e);
    return NextResponse.json({ error: "Failed to delete student." }, { status: 500 });
  }
}
