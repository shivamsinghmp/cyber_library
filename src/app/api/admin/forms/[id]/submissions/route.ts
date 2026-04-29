import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/api-helpers";

/** GET: List submissions for a form (admin) */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    const { user } = auth;
    const { id } = await params;
    const form = await prisma.studentForm.findUnique({
      where: { id },
      include: { fields: { orderBy: { order: "asc" } } },
    });
    if (!form) return NextResponse.json({ error: "Form not found" }, { status: 404 });

    const submissions = await prisma.studentFormSubmission.findMany({
      where: { formId: id },
      orderBy: { submittedAt: "desc" },
      include: {
        user: {
          select: { id: true, name: true, email: true, studentId: true },
        },
      },
    });

    return NextResponse.json({
      formTitle: form.title,
      fields: form.fields.map((f) => ({ id: f.id, label: f.label })),
      submissions: submissions.map((s) => ({
        id: s.id,
        userId: s.userId,
        userName: s.user.name,
        userEmail: s.user.email,
        studentId: s.user.studentId,
        data: s.data,
        submittedAt: s.submittedAt,
      })),
    });
  } catch (e) {
    console.error("GET /api/admin/forms/[id]/submissions:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
