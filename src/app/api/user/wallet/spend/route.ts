import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { deductCoins } from "@/lib/coins";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";

const bodySchema = z.object({
  productId: z.string().min(1).max(100),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = (session.user as { id: string }).id;

    // Rate limit: max 10 coin-spend attempts per minute per user
    const rl = rateLimit(`wallet_spend_${userId}`, 10, 60);
    if (!rl.success) return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });

    const body = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    const { productId } = parsed.data;

    const product = await prisma.digitalProduct.findUnique({
      where: { id: productId, isActive: true },
      select: { id: true, name: true, coinPrice: true, downloadUrl: true },
    });
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    if (!product.coinPrice) return NextResponse.json({ error: "This product is not available for coins" }, { status: 400 });

    const ip = (request.headers.get("x-forwarded-for")?.split(",")[0].trim()
      ?? request.headers.get("x-real-ip")
      ?? undefined);

    const success = await deductCoins(userId, product.coinPrice, `PURCHASE_PRODUCT_${productId}`, undefined, {
      sourceCategory: "product_purchase",
      sourceLabel:    `Bought: ${product.name}`,
      referenceType:  "product",
      referenceId:    product.id,
      referenceName:  product.name,
      deviceType:     "web_browser",
      ipAddress:      ip,
    });
    if (!success) return NextResponse.json({ error: "Insufficient coins" }, { status: 402 });

    try {
      await prisma.digitalPurchase.create({ data: { userId, productId } });
    } catch (err: unknown) {
      // P2002 = unique constraint violation — already purchased (race condition)
      if ((err as { code?: string })?.code === "P2002") {
        return NextResponse.json({ error: "Already purchased" }, { status: 409 });
      }
      throw err;
    }

    return NextResponse.json({
      success: true,
      message: `Unlocked "${product.name}" for ${product.coinPrice} coins`,
      downloadUrl: product.downloadUrl,
    });
  } catch (e) {
    console.error("POST /api/user/wallet/spend:", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
