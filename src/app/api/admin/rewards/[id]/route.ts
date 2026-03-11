import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  amount: z.number().int().min(0).optional(),
  enrollmentAmount: z.number().int().min(0).optional(),
  type: z.enum(["STREAK", "REFERRAL", "CONTEST", "OTHER"]).optional(),
  isActive: z.boolean().optional(),
});

/** PUT: Update reward (admin) */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if ((session?.user as { role?: string })?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }
    const reward = await prisma.reward.update({
      where: { id },
      data: parsed.data,
    });
    return NextResponse.json(reward);
  } catch (e) {
    console.error("PUT /api/admin/rewards/[id]:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

/** DELETE: Delete reward (admin) */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if ((session?.user as { role?: string })?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    await prisma.reward.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/admin/rewards/[id]:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
