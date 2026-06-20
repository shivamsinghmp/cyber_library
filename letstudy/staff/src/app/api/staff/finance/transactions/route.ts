import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkStaffModuleApi } from "@/lib/permissions";

/** GET only — read-only transaction lookup for support. No refund/void
 *  actions exist here (those stay admin-only in portal). */
export async function GET(request: Request) {
  try {
    const auth = await checkStaffModuleApi("FINANCE");
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const page   = Math.max(1, Number(searchParams.get("page") ?? 1));
    const search = searchParams.get("search")?.trim() ?? "";
    const take   = 50;
    const skip   = (page - 1) * take;

    const where = search
      ? {
          OR: [
            { transactionId:    { contains: search, mode: "insensitive" as const } },
            { paymentGatewayId: { contains: search, mode: "insensitive" as const } },
            { user: { OR: [
              { name:      { contains: search, mode: "insensitive" as const } },
              { email:     { contains: search, mode: "insensitive" as const } },
              { studentId: { contains: search, mode: "insensitive" as const } },
            ]}},
          ],
        }
      : {};

    const [list, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        include: {
          user: { select: { id: true, name: true, email: true, studentId: true } },
        },
      }),
      prisma.transaction.count({ where }),
    ]);

    const result = list.map((t) => ({
      id: t.id,
      transactionId: t.transactionId,
      userId: t.userId,
      amount: t.amount,
      currency: t.currency,
      status: t.status,
      orderDetails: t.orderDetails,
      createdAt: t.createdAt,
      user: t.user,
    }));

    return NextResponse.json({ data: result, total, page, hasMore: skip + list.length < total });
  } catch (e) {
    console.error("GET /api/staff/finance/transactions:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
