import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/** GET: List current user's digital purchases with product name and download URL */
export async function GET() {
  try {
    const session = await auth();
    let userId = (session?.user as { id?: string })?.id;
    if (!userId && session?.user?.email) {
      const dbUser = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
      if (dbUser) userId = dbUser.id;
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const purchases = await prisma.digitalPurchase.findMany({
      where: { userId },
      orderBy: { purchasedAt: "desc" },
      include: {
        product: {
          select: { id: true, name: true, downloadUrl: true },
        },
      },
    });

    const list = purchases.map((p) => ({
      id: p.id,
      productId: p.product.id,
      productName: p.product.name,
      downloadUrl: p.product.downloadUrl,
      purchasedAt: p.purchasedAt,
    }));

    return NextResponse.json(list);
  } catch (e) {
    console.error("GET /api/user/downloads:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
