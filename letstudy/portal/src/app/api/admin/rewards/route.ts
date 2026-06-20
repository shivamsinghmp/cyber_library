import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/api-helpers";
import { rewardSchema } from "@/lib/schemas";

/** GET: List all rewards (admin) */
export async function GET() {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    const list = await prisma.reward.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { winners: true } } },
    });
    return NextResponse.json(list);
  } catch (e) {
    console.error("GET /api/admin/rewards:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

/** POST: Create reward (admin) */
export async function POST(request: Request) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    const body = await request.json();
    const parsed = rewardSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }
    const reward = await prisma.reward.create({ data: parsed.data });
    return NextResponse.json(reward, { status: 201 });
  } catch (e) {
    console.error("POST /api/admin/rewards:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
