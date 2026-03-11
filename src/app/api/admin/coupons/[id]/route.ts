import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateCouponSchema = z.object({
  code: z.string().min(1).max(50).transform((s) => s.trim().toUpperCase()).optional(),
  discountType: z.enum(["PERCENT", "FIXED"]).optional(),
  discountValue: z.number().int().min(0).optional(),
  minOrderAmount: z.number().int().min(0).nullable().optional(),
  maxTotalUses: z.number().int().min(0).nullable().optional(),
  validFrom: z.string().nullable().optional().transform((s) => (s ? new Date(s).toISOString() : null)),
  validUntil: z.string().nullable().optional().transform((s) => (s ? new Date(s).toISOString() : null)),
  isActive: z.boolean().optional(),
  description: z.string().max(200).nullable().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const role = (session?.user as { role?: string })?.role;
    if (!session?.user || role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    const coupon = await prisma.coupon.findUnique({
      where: { id },
      include: { _count: { select: { redemptions: true } } },
    });
    if (!coupon) return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
    return NextResponse.json(coupon);
  } catch (e) {
    console.error("GET /api/admin/coupons/[id]:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const role = (session?.user as { role?: string })?.role;
    if (!session?.user || role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    const body = await request.json();
    const parsed = updateCouponSchema.safeParse({
      ...body,
      minOrderAmount: body.minOrderAmount === "" || body.minOrderAmount == null ? null : Number(body.minOrderAmount),
      maxTotalUses: body.maxTotalUses === "" || body.maxTotalUses == null ? null : Number(body.maxTotalUses),
      validFrom: body.validFrom || null,
      validUntil: body.validUntil || null,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const data = parsed.data;
    if (data.discountType === "PERCENT" && data.discountValue != null && data.discountValue > 100) {
      return NextResponse.json(
        { error: "Percent discount cannot exceed 100" },
        { status: 400 }
      );
    }
    if (data.code) {
      const existing = await prisma.coupon.findFirst({
        where: { code: data.code, id: { not: id } },
      });
      if (existing) {
        return NextResponse.json(
          { error: "Another coupon with this code already exists" },
          { status: 400 }
        );
      }
    }
    const updateData: Record<string, unknown> = {};
    if (data.code !== undefined) updateData.code = data.code;
    if (data.discountType !== undefined) updateData.discountType = data.discountType;
    if (data.discountValue !== undefined) updateData.discountValue = data.discountValue;
    if (data.minOrderAmount !== undefined) updateData.minOrderAmount = data.minOrderAmount;
    if (data.maxTotalUses !== undefined) updateData.maxTotalUses = data.maxTotalUses;
    if (data.validFrom !== undefined) updateData.validFrom = data.validFrom ? new Date(data.validFrom) : null;
    if (data.validUntil !== undefined) updateData.validUntil = data.validUntil ? new Date(data.validUntil) : null;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.description !== undefined) updateData.description = data.description?.trim() || null;

    const coupon = await prisma.coupon.update({
      where: { id },
      data: updateData as Parameters<typeof prisma.coupon.update>[0]["data"],
    });
    return NextResponse.json(coupon);
  } catch (e) {
    if ((e as { code?: string })?.code === "P2025") {
      return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
    }
    console.error("PUT /api/admin/coupons/[id]:", e);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const role = (session?.user as { role?: string })?.role;
    if (!session?.user || role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    await prisma.coupon.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if ((e as { code?: string })?.code === "P2025") {
      return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
    }
    console.error("DELETE /api/admin/coupons/[id]:", e);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
