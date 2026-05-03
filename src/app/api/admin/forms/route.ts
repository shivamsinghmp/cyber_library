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

const createFormSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
  fields: z.array(fieldSchema).default([]),
});

/** GET: List all student forms (admin) */
export async function GET() {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    // auth verified (user identity confirmed by requireSuperAdmin/requireAdmin)
    const forms = await prisma.studentForm.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        fields: { orderBy: { order: "asc" } },
        _count: { select: { submissions: true } },
      },
    });
    return NextResponse.json(forms);
  } catch (e) {
    console.error("GET /api/admin/forms:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

/** POST: Create a new student form with fields (admin) */
export async function POST(request: Request) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    // auth verified (user identity confirmed by requireSuperAdmin/requireAdmin)
    const body = await request.json();
    const parsed = createFormSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const { title, description, isActive, fields } = parsed.data;

    if (isActive) {
      await prisma.studentForm.updateMany({ data: { isActive: false } });
    }

    const form = await prisma.studentForm.create({
      data: {
        title,
        description: description ?? null,
        isActive,
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
      include: { fields: { orderBy: { order: "asc" } } },
    });
    return NextResponse.json(form, { status: 201 });
  } catch (e) {
    console.error("POST /api/admin/forms:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
