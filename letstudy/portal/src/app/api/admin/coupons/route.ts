import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/api-helpers";
import { couponSchema } from "@/lib/schemas";

export async function GET(request: Request) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);

    // Return influencers list for coupon owner selector
    if (searchParams.get("influencers") === "true") {
      const influencers = await prisma.user.findMany({
        where: { role: "INFLUENCER", deletedAt: null },
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" },
      });
      return NextResponse.json({ data: influencers });
    }

    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { redemptions: true } },
        owner: { select: { id: true, name: true, email: true } },
      },
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
    const body = await request.json();
    const parsed = couponSchema.safeParse({
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

    // Validate owner if provided
    const ownerId = typeof body.ownerId === "string" && body.ownerId.trim() ? body.ownerId.trim() : null;
    const commissionRate = ownerId ? (typeof body.commissionRate === "number" ? body.commissionRate : 0) : 0;

    if (ownerId) {
      const owner = await prisma.user.findUnique({ where: { id: ownerId }, select: { id: true, role: true } });
      if (!owner || owner.role !== "INFLUENCER") {
        return NextResponse.json({ error: "Invalid influencer" }, { status: 400 });
      }
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
        isPublic: data.isPublic ?? false,
        description: data.description?.trim() || null,
        ownerId,
        commissionRate,
      },
    });
    return NextResponse.json(coupon, { status: 201 });
  } catch (e) {
    console.error("POST /api/admin/coupons:", e);
    return NextResponse.json({ error: "Failed to create coupon" }, { status: 500 });
  }
}
