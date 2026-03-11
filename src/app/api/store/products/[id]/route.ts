import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET: Single product for store (public, no downloadUrl exposed until purchased) */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const product = await prisma.digitalProduct.findFirst({
      where: { id, isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        imageUrl: true,
      },
    });
    if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(product);
  } catch (e) {
    console.error("GET /api/store/products/[id]:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
