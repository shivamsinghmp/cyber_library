import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  price: z.number().int().min(0).optional(),
  imageUrl: z.string().nullable().optional(),
  downloadUrl: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

/** GET: One product (admin) */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if ((session?.user as { role?: string })?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    const product = await prisma.digitalProduct.findUnique({ where: { id } });
    if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(product);
  } catch (e) {
    console.error("GET /api/admin/products/[id]:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

/** PUT: Update product (admin) */
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
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const product = await prisma.digitalProduct.update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined && { name: parsed.data.name }),
        ...(parsed.data.description !== undefined && { description: parsed.data.description }),
        ...(parsed.data.price !== undefined && { price: parsed.data.price }),
        ...(parsed.data.imageUrl !== undefined && { imageUrl: parsed.data.imageUrl }),
        ...(parsed.data.downloadUrl !== undefined && { downloadUrl: parsed.data.downloadUrl }),
        ...(parsed.data.isActive !== undefined && { isActive: parsed.data.isActive }),
      },
    });
    return NextResponse.json(product);
  } catch (e) {
    console.error("PUT /api/admin/products/[id]:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

/** DELETE: Remove product (admin) */
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
    await prisma.digitalProduct.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/admin/products/[id]:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
