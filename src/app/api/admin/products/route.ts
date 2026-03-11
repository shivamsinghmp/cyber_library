import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  price: z.number().int().min(0),
  imageUrl: z.string().nullable().optional(),
  downloadUrl: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
});

/** GET: List all digital products (admin) */
export async function GET() {
  try {
    const session = await auth();
    if ((session?.user as { role?: string })?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const products = await prisma.digitalProduct.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { purchases: true } } },
    });
    return NextResponse.json(products);
  } catch (e) {
    console.error("GET /api/admin/products:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

/** POST: Create digital product (admin) */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if ((session?.user as { role?: string })?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const product = await prisma.digitalProduct.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        price: parsed.data.price,
        imageUrl: parsed.data.imageUrl ?? null,
        downloadUrl: parsed.data.downloadUrl ?? null,
        isActive: parsed.data.isActive,
      },
    });
    return NextResponse.json(product, { status: 201 });
  } catch (e) {
    console.error("POST /api/admin/products:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
