import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { searchParams } = new URL(request.url);
  const filter = searchParams.get("filter") ?? "all"; // all | earned | spent
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const take = 20;

  const where = {
    userId,
    ...(filter === "earned" ? { coins: { gt: 0 } } : filter === "spent" ? { coins: { lt: 0 } } : {}),
  };

  const [profile, logs, totals, spendableProducts] = await Promise.all([
    prisma.profile.findUnique({
      where: { userId },
      select: { coinBalance: true, fullName: true },
    }),
    prisma.studyCoinLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * take,
      take: take + 1,
    }),
    prisma.studyCoinLog.aggregate({
      where: { userId },
      _sum: { coins: true },
    }),
    prisma.digitalProduct.findMany({
      where: { isActive: true, coinPrice: { not: null } },
      select: { id: true, name: true, description: true, coinPrice: true, imageUrl: true },
      orderBy: { coinPrice: "asc" },
    }),
  ]);

  // Separate earn/spend totals
  const [earnTotal, spendTotal] = await Promise.all([
    prisma.studyCoinLog.aggregate({ where: { userId, coins: { gt: 0 } }, _sum: { coins: true } }),
    prisma.studyCoinLog.aggregate({ where: { userId, coins: { lt: 0 } }, _sum: { coins: true } }),
  ]);

  const hasMore = logs.length > take;
  const items = logs.slice(0, take);

  // Check which products user already purchased with coins
  const purchasedIds = await prisma.digitalPurchase.findMany({
    where: { userId, productId: { in: spendableProducts.map((p) => p.id) } },
    select: { productId: true },
  });
  const purchasedSet = new Set(purchasedIds.map((p) => p.productId));

  return NextResponse.json({
    coinBalance: profile?.coinBalance ?? 0,
    earnTotal: earnTotal._sum.coins ?? 0,
    spendTotal: Math.abs(spendTotal._sum.coins ?? 0),
    logs: items,
    hasMore,
    page,
    spendableProducts: spendableProducts.map((p) => ({
      ...p,
      purchased: purchasedSet.has(p.id),
    })),
  });
  } catch (e) {
    console.error("GET /api/user/wallet:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
