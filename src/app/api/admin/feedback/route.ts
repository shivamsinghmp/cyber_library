import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/api-helpers";

export async function GET(request: Request) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const page   = Math.max(1, Number(searchParams.get("page") ?? 1));
    const status = searchParams.get("status") ?? "ALL";
    const take   = 20;
    const skip   = (page - 1) * take;

    const statusWhere = status !== "ALL" ? { status } : {};

    const [feedbacks, total, allTotal, categoryAgg, ratingAgg] = await Promise.all([
      prisma.feedback.findMany({
        where: statusWhere,
        include: { user: { select: { id: true, studentId: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.feedback.count({ where: statusWhere }),
      prisma.feedback.count(),
      prisma.feedback.groupBy({ by: ["category"], _count: { _all: true } }),
      prisma.feedback.aggregate({ _avg: { rating: true } }),
    ]);

    return NextResponse.json({
      feedbacks,
      total,
      allTotal,
      page,
      hasMore: skip + feedbacks.length < total,
      categoryData: categoryAgg.map(a => ({ name: a.category, value: a._count._all })),
      ratingAvg: Number((ratingAgg._avg.rating ?? 0).toFixed(1)),
    });
  } catch (error) {
    console.error("Admin Feedback Fetch Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

const ALLOWED_FEEDBACK_STATUS = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;

export async function PATCH(req: Request) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;

    const { id, status } = await req.json();
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }
    if (!status || !ALLOWED_FEEDBACK_STATUS.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const updated = await prisma.feedback.update({
      where: { id },
      data: { status }
    });

    return NextResponse.json({ success: true, feedback: updated });
  } catch (error) {
    console.error("Admin Feedback Update Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
