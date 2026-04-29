import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/api-helpers";

const createCouponSchema = z.object({
  code: z.string().min(1).max(50).transform((s) => s.trim().toUpperCase()),
  discountType: z.enum(["PERCENT", "FIXED"]),
  discountValue: z.number().int().min(0),
  minOrderAmount: z.number().int().min(0).nullable().optional(),
  maxTotalUses: z.number().int().min(0).nullable().optional(),
  validFrom: z.string().nullable().optional().transform((s) => (s ? new Date(s).toISOString() : null)),
  validUntil: z.string().nullable().optional().transform((s) => (s ? new Date(s).toISOString() : null)),
  isActive: z.boolean().optional().default(true),
  description: z.string().max(200).nullable().optional(),
});

export async function GET() {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    const { user } = auth;
    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { redemptions: true } } },
    });
    return NextResponse.json(coupons);
  } catch (e) {
    console.error("GET /api/admin/coupons:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    const { user } = auth;
    const body = await request.json();
    const parsed = createCouponSchema.safeParse({
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
    if (data.discountType === "PERCENT" && data.discountValue > 100) {
      return NextResponse.json(
        { error: "Percent discount cannot exceed 100" },
        { status: 400 }
      );
    }
    const existing = await prisma.coupon.findUnique({
      where: { code: data.code },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A coupon with this code already exists" },
        { status: 400 }
      );
    }
    const coupon = await prisma.coupon.create({
      data: {
        code: data.code,
        discountType: data.discountType,
        discountValue: data.discountValue,
        minOrderAmount: data.minOrderAmount ?? null,
        maxTotalUses: data.maxTotalUses ?? null,
        validFrom: data.validFrom ? new Date(data.validFrom) : null,
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
        isActive: data.isActive,
        description: data.description?.trim() || null,
      },
    });
    return NextResponse.json(coupon, { status: 201 });
  } catch (e) {
    console.error("POST /api/admin/coupons:", e);
    return NextResponse.json({ error: "Failed to create coupon" }, { status: 500 });
  }
}
