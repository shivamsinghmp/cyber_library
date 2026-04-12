import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    const role = (session?.user as { role?: string })?.role;
    if (role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

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
    return NextResponse.json(faq);
  } catch (error) {
    console.error("PUT /api/admin/faqs/[id]:", error);
    return NextResponse.json({ error: "Failed to update FAQ" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    const role = (session?.user as { role?: string })?.role;
    if (role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    await prisma.faq.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/admin/faqs/[id]:", error);
    return NextResponse.json({ error: "Failed to delete FAQ" }, { status: 500 });
  }
}
