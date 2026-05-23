import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  STUDENT_MODULES,
  getDisabledModules,
  getStudentDisabledModules,
  setStudentDisabledModules,
} from "@/lib/student-modules";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (!session?.user || (role !== "ADMIN" && !(session.user as { isSuperAdmin?: boolean }).isSuperAdmin)) {
    return null;
  }
  return session;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const [globalDisabled, studentDisabled] = await Promise.all([
    getDisabledModules(),
    getStudentDisabledModules(userId),
  ]);

  const globalSet  = new Set(globalDisabled);
  const studentSet = new Set(studentDisabled);

  const modules = STUDENT_MODULES.map(m => ({
    id:             m.id,
    label:          m.label,
    section:        m.section,
    globallyDisabled: globalSet.has(m.id),
    studentDisabled:  studentSet.has(m.id),
    accessible: !globalSet.has(m.id) && !studentSet.has(m.id),
  }));

  return NextResponse.json({ user, modules, studentDisabled });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await params;
  const body = await request.json().catch(() => ({}));
  const submitted: string[] = Array.isArray(body.disabled) ? body.disabled : [];
  const validIds = new Set(STUDENT_MODULES.map((m) => m.id));
  const disabled = submitted.filter((id) => typeof id === "string" && validIds.has(id));

  await setStudentDisabledModules(userId, disabled);
  return NextResponse.json({ success: true, disabled });
}
