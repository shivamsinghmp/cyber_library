import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/** GET: List all transactions (admin only) */
export async function GET() {
  try {
    const session = await auth();
    const role = (session?.user as { role?: string })?.role;
    if (!session?.user || role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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
