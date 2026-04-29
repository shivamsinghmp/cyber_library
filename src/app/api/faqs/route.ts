import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchWithCache } from "@/lib/redis";

// FAQs rarely change — cache for 10 minutes
export async function GET() {
  try {
    const faqs = await fetchWithCache(
      "public:faqs",
      () => prisma.faq.findMany({
        where: { isActive: true },
        orderBy: { order: "asc" },
        select: { id: true, question: true, answer: true, order: true },
      }),
      600 // 10 min
    );
    return NextResponse.json(faqs);
  } catch (error) {
    console.error("GET /api/faqs:", error);
    return NextResponse.json({ error: "Failed to load FAQs" }, { status: 500 });
  }
}
