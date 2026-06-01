import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-helpers";
import { signAdminViewToken } from "@/lib/adminViewToken";
import { z } from "zod";

const bodySchema = z.object({
  studentId: z.string().min(1),
  page:      z.string().min(1).max(200).startsWith("/"),
});

/**
 * POST /api/admin/student-view/token
 * Generates a 15-min signed impersonation token and logs the access.
 * Returns: { token, redirectUrl }
 */
export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const body   = await request.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });
    }

    const { studentId, page } = parsed.data;

    // Verify student exists
    const student = await prisma.user.findUnique({
      where:  { id: studentId },
      select: { id: true, name: true, studentId: true, role: true, profile: { select: { fullName: true } } },
    });
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    // Prevent admins viewing other admins/employees
    if (["ADMIN", "EMPLOYEE"].includes(student.role)) {
      return NextResponse.json({ error: "Cannot impersonate admin/employee accounts" }, { status: 403 });
    }

    const adminProfile = await prisma.user.findUnique({
      where: { id: auth.user.id },
      select: { name: true, profile: { select: { fullName: true } } },
    });
    const adminName = adminProfile?.profile?.fullName ?? adminProfile?.name ?? auth.user.email?.split("@")[0] ?? "Admin";
    const token     = signAdminViewToken(auth.user.id, adminName, studentId);
    const ip        = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? null;

    // Log impersonation start
    await prisma.adminStudentAccessLog.create({
      data: {
        adminId:        auth.user.id,
        adminName,
        adminIp:        ip ?? null,
        studentId:      student.id,
        studentUniqueId: student.studentId ?? undefined,
        studentName:    student.profile?.fullName ?? student.name ?? undefined,
        pageAccessed:   page,
        action:         "impersonate",
        sessionToken:   token.slice(0, 20), // store prefix only — not the full secret
      },
    });

    // Build the redirect URL with the token in the query param
    const redirectUrl = `${page}${page.includes("?") ? "&" : "?"}_admin_view=${token}`;

    return NextResponse.json({ token, redirectUrl });
  } catch (e) {
    console.error("POST /api/admin/student-view/token:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
