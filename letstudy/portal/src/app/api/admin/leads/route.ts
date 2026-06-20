import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/api-helpers";

/** GET: List lead (landing form) submissions for admin — paginated. */
export async function GET(request: Request) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const page   = Math.max(1, Number(searchParams.get("page") ?? 1));
    const search = searchParams.get("search")?.trim() ?? "";
    const take   = 50;
    const skip   = (page - 1) * take;

    // LeadSubmission.data is a Json field — search is done post-fetch for source field
    // Source is a plain string column, so we can filter on it
    const where = search
      ? { source: { contains: search, mode: "insensitive" as const } }
      : {};

    const [leads, total] = await Promise.all([
      prisma.leadSubmission.findMany({
        where,
        orderBy: { createdAt: "desc" },
        select: { id: true, data: true, source: true, createdAt: true },
        skip,
        take,
      }),
      prisma.leadSubmission.count({ where }),
    ]);

    return NextResponse.json({ data: leads, total, page, hasMore: skip + leads.length < total });
  } catch (e) {
    console.error("GET /api/admin/leads:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

