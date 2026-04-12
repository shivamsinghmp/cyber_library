import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    const role = (session?.user as { role?: string })?.role;
    if (role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const faqs = await prisma.faq.findMany({ orderBy: { order: "asc" } });
    return NextResponse.json(faqs);
  } catch (error) {
    console.error("GET /api/admin/faqs:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    const role = (session?.user as { role?: string })?.role;
    if (role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const data = await request.json();
    const faq = await prisma.faq.create({
      data: {
        question: data.question,
        answer: data.answer,
        order: data.order ?? 0,
        isActive: data.isActive ?? true,
      },
    });
    return NextResponse.json(faq);
  } catch (error) {
    console.error("POST /api/admin/faqs:", error);
    return NextResponse.json({ error: "Failed to create FAQ" }, { status: 500 });
  }
}
