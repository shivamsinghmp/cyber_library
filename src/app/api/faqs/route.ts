import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const faqs = await prisma.faq.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    });
    return NextResponse.json(faqs);
  } catch (error) {
    console.error("GET /api/faqs:", error);
    return NextResponse.json({ error: "Failed to load FAQs" }, { status: 500 });
  }
}
