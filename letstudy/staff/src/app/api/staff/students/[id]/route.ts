import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { checkStaffModuleApi } from "@/lib/permissions";
import { logAdminAction } from "@/lib/audit-logger";

// Deliberately excludes newPassword, coinBalance, totalPoints, currentStreak,
// longestStreak — those stay admin-only in portal (password resets and
// coin/points overrides are security- and finance-adjacent, not "edit a
// student's contact details" support work).
const updateStudentSchema = z.object({
  name:           z.string().optional(),
  email:          z.string().email("Invalid email").optional(),
  goal:           z.string().optional().nullable(),
  fullName:       z.string().optional().nullable(),
  phone:          z.string().optional().nullable(),
  whatsappNumber: z.string().optional().nullable(),
  studyGoal:      z.string().optional().nullable(),
  targetExam:     z.string().optional().nullable(),
  targetYear:     z.string().optional().nullable(),
  institution:    z.string().optional().nullable(),
  bio:            z.string().optional().nullable(),
  profilePicUrl:  z.string().optional().nullable(),
  dailyMantra:    z.string().optional().nullable(),
  position:       z.string().optional().nullable(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkStaffModuleApi("STUDENT_MGMT");
    if (auth.error) return auth.error;

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
    const attendanceDays = Object.values(minutesByDate).filter((mins) => mins >= 30).length;

    const { password: _password, ...safe } = studentUser;
    return NextResponse.json({ ...safe, attendanceDays });
  } catch (e) {
    console.error("GET /api/staff/students/[id]:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkStaffModuleApi("STUDENT_MGMT");
    if (auth.error) return auth.error;
    const { user } = auth;

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
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const d = parsed.data;

    const userData: Record<string, unknown> = {};
    if (d.name  !== undefined) userData.name  = d.name;
    if (d.email !== undefined) userData.email = d.email;
    if (d.goal  !== undefined) userData.goal  = d.goal;

    if (userData.email && userData.email !== existing.email) {
      const emailTaken = await prisma.user.findUnique({ where: { email: userData.email as string } });
      if (emailTaken) return NextResponse.json({ error: "Email already in use." }, { status: 409 });
    }

    const profileData: Record<string, unknown> = {};
    const profileFields = [
      "fullName", "phone", "whatsappNumber", "studyGoal", "targetExam",
      "targetYear", "institution", "bio", "profilePicUrl", "dailyMantra", "position",
    ] as const;
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

    await logAdminAction(
      user.id,
      "UPDATE",
      "STUDENT",
      `Staff updated student profile for '${existing.email}'`,
      request.headers.get("x-forwarded-for") || undefined
    );

    return NextResponse.json(updated);
  } catch (e) {
    console.error("PUT /api/staff/students/[id]:", e);
    return NextResponse.json({ error: "Failed to update student." }, { status: 500 });
  }
}
