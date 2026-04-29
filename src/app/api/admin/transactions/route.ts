import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/api-helpers";

/** GET: List all transactions (admin only) */
export async function GET() {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    const { user } = auth;

    const list = await prisma.transaction.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            studentId: true,
          },
        },
      },
    });

    const result = list.map((t) => ({
      id: t.id,
      transactionId: t.transactionId,
      userId: t.userId,
      amount: t.amount,
      currency: t.currency,
      status: t.status,
      paymentGatewayId: t.paymentGatewayId,
      orderDetails: t.orderDetails,
      createdAt: t.createdAt,
      user: t.user,
    }));

    return NextResponse.json(result);
  } catch (e) {
    console.error("GET /api/admin/transactions:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
