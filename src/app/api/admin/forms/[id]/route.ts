import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/api-helpers";

const fieldSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1),
  type: z.enum(["TEXT", "EMAIL", "NUMBER", "TEXTAREA", "SELECT"]),
  required: z.boolean().default(false),
  options: z.string().nullable().optional(),
  order: z.number().int().min(0).default(0),
});

const updateFormSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  fields: z.array(fieldSchema).optional(),
});

/** GET: Get one form with fields (admin) */
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
    return NextResponse.json(form);
  } catch (e) {
    console.error("GET /api/admin/forms/[id]:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

/** PUT: Update form and replace fields (admin) */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    const { user } = auth;
    const { id } = await params;
    const existing = await prisma.studentForm.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Form not found" }, { status: 404 });

    const body = await request.json();
    const parsed = updateFormSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const { title, description, isActive, fields } = parsed.data;

    if (isActive === true) {
      await prisma.studentForm.updateMany({
        where: { id: { not: id } },
        data: { isActive: false },
      });
    }

    const updateData: { title?: string; description?: string | null; isActive?: boolean } = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive;

    if (fields !== undefined) {
      await prisma.studentFormField.deleteMany({ where: { formId: id } });
      await prisma.studentForm.update({
        where: { id },
        data: {
          ...updateData,
          fields: {
            create: fields.map((f, i) => ({
              label: f.label,
              type: f.type,
              required: f.required,
              options: f.options ?? null,
              order: f.order ?? i,
            })),
          },
        },
      });
    } else {
      await prisma.studentForm.update({ where: { id }, data: updateData });
    }

    const form = await prisma.studentForm.findUnique({
      where: { id },
      include: { fields: { orderBy: { order: "asc" } } },
    });
    return NextResponse.json(form);
  } catch (e) {
    console.error("PUT /api/admin/forms/[id]:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

/** DELETE: Delete form (admin) */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    const { user } = auth;
    const { id } = await params;
    await prisma.studentForm.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/admin/forms/[id]:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
