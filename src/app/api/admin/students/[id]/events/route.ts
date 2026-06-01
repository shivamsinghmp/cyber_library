import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/api-helpers";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200);

    const events = await prisma.studentEvent.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, event: true, page: true, meta: true, createdAt: true },
    });

    return NextResponse.json(events);
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
