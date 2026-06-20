import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-helpers";

/**
 * GET /api/admin/whatsapp/signup-trigger
 * Returns the currently active signup trigger template, or null.
 */
export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const tmpl = await prisma.whatsAppTemplate.findFirst({
      where: { triggerEvent: "signup", isActive: true, status: "APPROVED" },
      select: {
        id: true, name: true, status: true, bodyText: true,
        variableCount: true, variableLabels: true, language: true,
        triggerEvent: true, isActive: true, syncedAt: true,
      },
    });

    return NextResponse.json({ template: tmpl ?? null });
  } catch (e) {
    console.error("GET /api/admin/whatsapp/signup-trigger:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

/**
 * PUT /api/admin/whatsapp/signup-trigger
 * Atomically sets one APPROVED template as the signup trigger.
 * Clears triggerEvent="signup" from all other templates first.
 * Body: { templateName: string }
 */
export async function PUT(request: Request) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const body = await request.json().catch(() => ({}));
    const templateName = typeof body.templateName === "string" ? body.templateName.trim() : "";
    if (!templateName) {
      return NextResponse.json({ error: "templateName is required" }, { status: 400 });
    }

    // Verify template exists and is APPROVED
    const tmpl = await prisma.whatsAppTemplate.findUnique({
      where: { name: templateName },
      select: { id: true, name: true, status: true },
    });

    if (!tmpl) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }
    if (tmpl.status !== "APPROVED") {
      return NextResponse.json({ error: "Only APPROVED templates can be selected" }, { status: 400 });
    }

    // Atomic: clear existing signup trigger → set new one
    await prisma.$transaction([
      // 1. Remove signup trigger from all other templates
      prisma.whatsAppTemplate.updateMany({
        where: { triggerEvent: "signup", name: { not: templateName } },
        data:  { triggerEvent: null },
      }),
      // 2. Set this template as signup trigger (and mark active)
      prisma.whatsAppTemplate.update({
        where: { name: templateName },
        data:  { triggerEvent: "signup", isActive: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: `${templateName} is now the signup trigger`,
    });
  } catch (e) {
    console.error("PUT /api/admin/whatsapp/signup-trigger:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/whatsapp/signup-trigger
 * Clears the signup trigger (no template will fire on signup).
 */
export async function DELETE() {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    await prisma.whatsAppTemplate.updateMany({
      where: { triggerEvent: "signup" },
      data:  { triggerEvent: null },
    });

    return NextResponse.json({ success: true, message: "Signup trigger hata diya" });
  } catch (e) {
    console.error("DELETE /api/admin/whatsapp/signup-trigger:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
