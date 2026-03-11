import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/** GET: List all digital product purchases with buyer and product details (admin) */
export async function GET() {
  try {
    const session = await auth();
    if ((session?.user as { role?: string })?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const purchases = await prisma.digitalPurchase.findMany({
      orderBy: { purchasedAt: "desc" },
      include: {
        user: {
          select: { id: true, name: true, email: true, studentId: true },
        },
        product: {
          select: { id: true, name: true, price: true },
        },
      },
    });

    const list = purchases.map((p) => ({
      id: p.id,
      productId: p.product.id,
      productName: p.product.name,
      productPrice: p.product.price,
      userId: p.user.id,
      userName: p.user.name,
      userEmail: p.user.email,
      studentId: p.user.studentId,
      transactionId: p.transactionId,
      purchasedAt: p.purchasedAt,
    }));

    return NextResponse.json(list);
  } catch (e) {
    console.error("GET /api/admin/products/purchases:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
