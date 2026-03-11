import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/** GET: Get the active student form with fields (for logged-in student) */
export async function GET() {
  try {
    const session = await auth();
    const userId = (session?.user as { id?: string })?.id;
    if (!session?.user || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const form = await prisma.studentForm.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: "desc" },
      include: { fields: { orderBy: { order: "asc" } } },
    });

    if (!form) {
      return NextResponse.json({ form: null, message: "No active form" });
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
    const userId = (session?.user as { id?: string })?.id;
    if (!session?.user || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
