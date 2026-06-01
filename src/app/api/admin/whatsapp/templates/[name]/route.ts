import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/api-helpers";
import { z } from "zod";

const VALID_TRIGGERS = [
  "signup", "daily_8pm", "daily_9am",
  "3days_before", "1day_before", "on_expiry", "manual",
] as const;

const schema = z.object({
  triggerEvent: z.enum(VALID_TRIGGERS).nullable(),
  isActive:     z.boolean().optional(),
});

/** PUT /api/admin/whatsapp/templates/[name] — Update trigger config for a template */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;

    const { name } = await params;
    const body   = await request.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });
    }

    const { triggerEvent, isActive } = parsed.data;

    const existing = await prisma.whatsAppTemplate.findUnique({ where: { name } });
    if (!existing) {
      return NextResponse.json({ error: "Template nahi mila" }, { status: 404 });
    }
    if (existing.status !== "APPROVED" && isActive === true) {
      return NextResponse.json({ error: "Sirf APPROVED templates ko activate kar sakte hain" }, { status: 400 });
    }

    const updated = await prisma.whatsAppTemplate.update({
      where: { name },
      data: {
        ...(triggerEvent !== undefined ? { triggerEvent } : {}),
        ...(isActive     !== undefined ? { isActive }     : {}),
      },
    });

    return NextResponse.json({ ok: true, template: updated });
  } catch (e) {
    console.error("PUT /api/admin/whatsapp/templates/[name]:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
