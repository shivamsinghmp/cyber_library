import { NextResponse } from "next/server";
import { requireAdmin, requireSuperAdmin } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") ?? "ALL";
    const search = searchParams.get("search") ?? "";
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = 20;

    const where: Record<string, unknown> = {};
    if (status !== "ALL") where.status = status;

    const rows = await prisma.userSubscription.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, studentId: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit + 1,
    });

    // filter by search after fetch (email/name)
    const filtered = search
      ? rows.filter(
          (r) =>
            r.user.email.toLowerCase().includes(search.toLowerCase()) ||
            (r.user.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
            (r.user.studentId ?? "").toLowerCase().includes(search.toLowerCase())
        )
      : rows;

    const hasMore = filtered.length > limit;
    const data = filtered.slice(0, limit).map((r) => ({
      id: r.id,
      userId: r.userId,
      planType: r.planType,
      status: r.status,
      startDate: r.startDate,
      endDate: r.endDate,
      amountPaid: r.amountPaid,
      transactionId: r.transactionId,
      createdAt: r.createdAt,
      user: r.user,
    }));

    // summary counts
    const [active, expired, cancelled] = await Promise.all([
      prisma.userSubscription.count({ where: { status: "ACTIVE" } }),
      prisma.userSubscription.count({ where: { status: "EXPIRED" } }),
      prisma.userSubscription.count({ where: { status: "CANCELLED" } }),
    ]);

    return NextResponse.json({ data, hasMore, page, summary: { active, expired, cancelled } });
  } catch (e) {
    console.error("GET /api/admin/subscriptions:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    // Subscription status changes (activate / expire / cancel) directly affect
    // paid access. Restrict to ADMIN only — EMPLOYEEs with ENGAGEMENT permission
    // could otherwise grant themselves or others free paid plans.
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;

    const { id, status } = await request.json();
    if (!id || !["ACTIVE", "EXPIRED", "CANCELLED"].includes(status)) {
      return NextResponse.json({ error: "Invalid" }, { status: 400 });
    }

    await prisma.userSubscription.update({ where: { id }, data: { status } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
