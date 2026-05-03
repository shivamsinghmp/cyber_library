import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/api-helpers";

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  amount: z.number().int().min(0),
  enrollmentAmount: z.number().int().min(0).optional().default(0),
  type: z.enum(["STREAK", "REFERRAL", "CONTEST", "OTHER"]).default("OTHER"),
  isActive: z.boolean().default(true),
});

/** GET: List all rewards (admin) */
export async function GET() {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    // auth verified (user identity confirmed by requireSuperAdmin/requireAdmin)
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
    // auth verified (user identity confirmed by requireSuperAdmin/requireAdmin)
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
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
