import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

/** GET: Get the active student form with fields (for logged-in student) */
export async function GET() {
  try {
    const session = await auth();
    let userId = (session?.user as { id?: string })?.id;
    if (!userId && session?.user?.email) {
      const dbUser = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
      if (dbUser) userId = dbUser.id;
    }

    if (!session?.user || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Always fetch past submissions regardless of whether there's an active form
    const pastSubmissionsData = await prisma.studentFormSubmission.findMany({
      where: { userId },
      include: { form: { select: { title: true } } },
      orderBy: { submittedAt: 'desc' }
    });

    const pastSubmissions = pastSubmissionsData.map(sub => ({
      id: sub.id,
      title: sub.form?.title || 'Unknown Form',
      submittedAt: sub.submittedAt.toISOString(),
      data: sub.data
    }));

    const form = await prisma.studentForm.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: "desc" },
      include: { fields: { orderBy: { order: "asc" } } },
    });

    if (!form) {
      return NextResponse.json({ form: null, alreadySubmitted: false, pastSubmissions, message: "No active form" });
    }

    const existing = await prisma.studentFormSubmission.findFirst({
      where: { userId, formId: form.id },
    });
    const alreadySubmitted = !!existing;

    return NextResponse.json({
      form: {
        id: form.id,
        title: form.title,
        description: form.description,
        fields: form.fields.map((f) => ({
          id: f.id,
          label: f.label,
          type: f.type,
          required: f.required,
          options: f.options ? f.options.split(",").map((o) => o.trim()) : null,
          order: f.order,
        })),
      },
      alreadySubmitted: !!alreadySubmitted,
      pastSubmissions,
    });
  } catch (e) {
    console.error("GET /api/student/form:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

/** POST: Submit student form (data = { fieldId: value }) */
export async function POST(request: Request) {
  try {
    const session = await auth();
    let userId = (session?.user as { id?: string })?.id;
    if (!userId && session?.user?.email) {
      const dbUser = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
      if (dbUser) userId = dbUser.id;
    }

    if (!session?.user || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = rateLimit(`student_form_${userId}`, 3, 60); // Max 3 rapid consecutive requests per minute
    if (!rl.success) {
      return NextResponse.json({ error: "Rate limit exceeded. Please wait a moment." }, { status: 429 });
    }

    const body = await request.json();
    const formId = typeof body.formId === "string" ? body.formId.trim() : null;
    const data = body.data && typeof body.data === "object" ? body.data : null;
    if (!formId || !data) {
      return NextResponse.json({ error: "formId and data required" }, { status: 400 });
    }

    const form = await prisma.studentForm.findFirst({
      where: { id: formId, isActive: true },
      include: { fields: true },
    });
    if (!form) {
      return NextResponse.json({ error: "Form not found or inactive" }, { status: 404 });
    }

    const existing = await prisma.studentFormSubmission.findFirst({
      where: { userId, formId },
    });
    if (existing) {
      return NextResponse.json({ error: "Already submitted" }, { status: 400 });
    }

    await prisma.studentFormSubmission.create({
      data: { formId, userId, data },
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("POST /api/student/form:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
