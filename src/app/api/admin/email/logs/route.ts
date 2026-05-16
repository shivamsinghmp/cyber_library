import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/api-helpers";

export async function GET(request: Request) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const status  = searchParams.get("status") ?? "all";
    const purpose = searchParams.get("purpose") ?? "all";
    const search  = searchParams.get("search")?.trim() ?? "";
    const page    = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const take    = 50;

    const where: Record<string, unknown> = {};
    if (status  !== "all") where.status  = status.toUpperCase();
    if (purpose !== "all") where.purpose = purpose.toUpperCase();
    if (search) where.OR = [
      { toEmail: { contains: search, mode: "insensitive" } },
      { toName:  { contains: search, mode: "insensitive" } },
      { subject: { contains: search, mode: "insensitive" } },
    ];

    const [logs, total, stats] = await Promise.all([
      prisma.emailLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * take,
        take,
      }),
      prisma.emailLog.count({ where }),
      prisma.emailLog.groupBy({
        by: ["status"],
        _count: { status: true },
      }),
    ]);

    const statsMap = Object.fromEntries(stats.map((s) => [s.status, s._count.status]));

    return NextResponse.json({ logs, total, page, statsMap });
  } catch (e) {
    console.error("GET /api/admin/email/logs:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
