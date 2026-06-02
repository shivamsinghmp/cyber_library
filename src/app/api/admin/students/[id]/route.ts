import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/api-helpers";

const updateStudentSchema = z.object({
  // User fields
  name:        z.string().optional(),
  email:       z.string().email("Invalid email").optional(),
  goal:        z.string().optional().nullable(),
  newPassword: z.string().min(8).optional(),
  // Profile fields
  fullName:        z.string().optional().nullable(),
  phone:           z.string().optional().nullable(),
  whatsappNumber:  z.string().optional().nullable(),
  studyGoal:       z.string().optional().nullable(),
  targetExam:      z.string().optional().nullable(),
  targetYear:      z.string().optional().nullable(),
  institution:     z.string().optional().nullable(),
  bio:             z.string().optional().nullable(),
  profilePicUrl:   z.string().optional().nullable(),
  dailyMantra:     z.string().optional().nullable(),
  position:        z.string().optional().nullable(),
  coinBalance:     z.number().int().min(0).optional(),
  totalPoints:     z.number().int().min(0).optional(),
  currentStreak:   z.number().int().min(0).optional(),
  longestStreak:   z.number().int().min(0).optional(),
});

/** GET: Get single student details (admin only) */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    const { user: adminUser } = auth;

    const { id } = await params;
    const [studentUser, sessions] = await Promise.all([
      prisma.user.findFirst({
        where: { id, role: "STUDENT", deletedAt: null },
        include: { profile: true },
      }),
      prisma.studySession.findMany({
        where: { userId: id, durationMinutes: { not: null } },
        select: { startedAt: true, durationMinutes: true },
      }),
    ]);
    if (!studentUser) {
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

    const { password: _, ...safe } = studentUser;
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
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    const { user: adminUser } = auth;

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

    const d = parsed.data;

    // User-level fields
    const userData: Record<string, unknown> = {};
    if (d.name  !== undefined) userData.name  = d.name;
    if (d.email !== undefined) userData.email = d.email;
    if (d.goal  !== undefined) userData.goal  = d.goal;
    if (d.newPassword) userData.password = await bcrypt.hash(d.newPassword, 12);

    if (userData.email && userData.email !== existing.email) {
      const emailTaken = await prisma.user.findUnique({ where: { email: userData.email as string } });
      if (emailTaken) return NextResponse.json({ error: "Email already in use." }, { status: 409 });
    }

    // Profile-level fields
    const profileData: Record<string, unknown> = {};
    const profileFields = ["fullName","phone","whatsappNumber","studyGoal","targetExam","targetYear","institution","bio","profilePicUrl","dailyMantra","position","coinBalance","totalPoints","currentStreak","longestStreak"] as const;
    for (const key of profileFields) {
      if (d[key] !== undefined) profileData[key] = d[key];
    }

    const updated = await prisma.user.update({
      where: { id, role: "STUDENT" },
      data: userData,
      select: { id: true, studentId: true, name: true, email: true, goal: true, createdAt: true },
    });

    if (Object.keys(profileData).length > 0) {
      await prisma.profile.upsert({
        where:  { userId: id },
        create: { userId: id, ...profileData },
        update: profileData,
      });
    }

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
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    const { user: adminUser } = auth;

    const { id } = await params;
    const existing = await prisma.user.findFirst({
      where: { id, role: "STUDENT", deletedAt: null },
    });
    if (!existing) {
      return NextResponse.json({ error: "Student not found." }, { status: 404 });
    }

    await prisma.user.update({
      where: { id, role: "STUDENT" },
      data: { deletedAt: new Date() },
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/admin/students/[id]:", e);
    return NextResponse.json({ error: "Failed to delete student." }, { status: 500 });
  }
}
