import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { invalidateCache } from "@/lib/redis";
import { requireSuperAdmin } from "@/lib/api-helpers";

export async function GET() {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    // auth verified (user identity confirmed by requireSuperAdmin/requireAdmin)

    const faqs = await prisma.faq.findMany({ orderBy: { order: "asc" } });
    await invalidateCache("public:faqs");
    return NextResponse.json(faqs);
  } catch (error) {
    console.error("GET /api/admin/faqs:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    // auth verified (user identity confirmed by requireSuperAdmin/requireAdmin)

    const data = await request.json();
    const faq = await prisma.faq.create({
      data: {
        question: data.question,
        answer: data.answer,
        order: data.order ?? 0,
        isActive: data.isActive ?? true,
      },
    });
    await invalidateCache("public:faqs");
    return NextResponse.json(faq);
  } catch (error) {
    console.error("POST /api/admin/faqs:", error);
    return NextResponse.json({ error: "Failed to create FAQ" }, { status: 500 });
  }
}
