import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET: List active digital products for store (public) */
export async function GET() {
  try {
    const products = await prisma.digitalProduct.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        imageUrl: true,
      },
    });
    return NextResponse.json(products);
  } catch (e) {
    console.error("GET /api/store/products:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
