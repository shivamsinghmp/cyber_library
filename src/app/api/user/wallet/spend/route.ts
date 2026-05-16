import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { deductCoins } from "@/lib/coins";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const body = await request.json().catch(() => null);
  const { productId } = body ?? {};
  if (!productId) return NextResponse.json({ error: "productId required" }, { status: 400 });

  const product = await prisma.digitalProduct.findUnique({
    where: { id: productId, isActive: true },
    select: { id: true, name: true, coinPrice: true, downloadUrl: true },
  });
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
  if (!product.coinPrice) return NextResponse.json({ error: "This product is not available for coins" }, { status: 400 });

  // Check if already purchased
  const existing = await prisma.digitalPurchase.findFirst({ where: { userId, productId } });
  if (existing) return NextResponse.json({ error: "Already purchased" }, { status: 409 });

  const success = await deductCoins(userId, product.coinPrice, `PURCHASE_PRODUCT_${productId}`);
  if (!success) {
    return NextResponse.json({ error: "Insufficient coins" }, { status: 402 });
  }

  await prisma.digitalPurchase.create({
    data: { userId, productId },
  });

  return NextResponse.json({
    success: true,
    message: `Unlocked "${product.name}" for ${product.coinPrice} coins`,
    downloadUrl: product.downloadUrl,
  });
}
