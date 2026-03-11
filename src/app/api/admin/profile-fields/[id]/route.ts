import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const role = (u: unknown) => (u as { role?: string })?.role;
const TYPES = ["text", "number", "email", "textarea", "select"] as const;

const updateSchema = z.object({
  label: z.string().min(1).max(200).optional(),
  type: z.enum(TYPES).optional(),
  required: z.boolean().optional(),
  options: z.array(z.string()).optional().nullable(),
  sortOrder: z.number().int().optional(),
});

/** PUT: Update a profile field definition */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || role(session.user) !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const updated = await prisma.profileFieldDefinition.update({
      where: { id },
      // Cast to any to satisfy Prisma's JSON input type for options
      data: {
        ...(parsed.data.label !== undefined && { label: parsed.data.label }),
        ...(parsed.data.type !== undefined && { type: parsed.data.type }),
        ...(parsed.data.required !== undefined && { required: parsed.data.required }),
        ...(parsed.data.options !== undefined && {
          options:
            parsed.data.options === null
              ? (null as any)
              : (parsed.data.options as any),
        }),
        ...(parsed.data.sortOrder !== undefined && {
          sortOrder: parsed.data.sortOrder,
        }),
      } as any,
    });
    return NextResponse.json(updated);
  } catch (e) {
    if ((e as { code?: string })?.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error("PUT /api/admin/profile-fields/[id]:", e);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

/** DELETE: Remove a profile field definition */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || role(session.user) !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    await prisma.profileFieldDefinition.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if ((e as { code?: string })?.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error("DELETE /api/admin/profile-fields/[id]:", e);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
