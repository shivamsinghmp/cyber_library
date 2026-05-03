import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { invalidateCache } from "@/lib/redis";
import { requireSuperAdmin } from "@/lib/api-helpers";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    // auth verified (user identity confirmed by requireSuperAdmin/requireAdmin)

    const params = await context.params;
    const data = await request.json();
    const faq = await prisma.faq.update({
      where: { id: params.id },
      data: {
        question: data.question,
        answer: data.answer,
        order: data.order,
        isActive: data.isActive,
      },
    });
    await invalidateCache("public:faqs");
    return NextResponse.json(faq);
  } catch (error) {
    console.error("PUT /api/admin/faqs/[id]:", error);
    return NextResponse.json({ error: "Failed to update FAQ" }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    // auth verified (user identity confirmed by requireSuperAdmin/requireAdmin)

    const params = await context.params;
    await prisma.faq.delete({ where: { id: params.id } });
    await invalidateCache("public:faqs");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/admin/faqs/[id]:", error);
    return NextResponse.json({ error: "Failed to delete FAQ" }, { status: 500 });
  }
}
