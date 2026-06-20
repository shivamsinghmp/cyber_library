import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateTransactionId } from "@/lib/transactionId";
import { z } from "zod";

const createBodySchema = z.object({
  amount: z.number().int().min(0),
  status: z.enum(["SUCCESS", "PENDING", "FAILED"]).default("SUCCESS"),
  paymentGatewayId: z.string().optional(),
  orderDetails: z
    .array(
      z.object({
        slotId: z.string().optional(),
        productId: z.string().optional(),
        name: z.string(),
        price: z.number(),
      })
    )
    .optional(),
});

/** GET: List current user's transactions */
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

    const list = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        transactionId: true,
        amount: true,
        currency: true,
        status: true,
        paymentGatewayId: true,
        orderDetails: true,
        createdAt: true,
        user: {
          select: {
            email: true,
            name: true,
            profile: {
              select: {
                fullName: true,
                phone: true,
                whatsappNumber: true
              }
            }
          }
        }
      },
    });

    // Map the response to flatten the user info into the transaction root
    const mappedList = list.map(t => ({
      ...t,
      customerName: t.user?.profile?.fullName || t.user?.name || "",
      customerEmail: t.user?.email || "",
      customerPhone: t.user?.profile?.whatsappNumber || t.user?.profile?.phone || ""
    }));

    return NextResponse.json(mappedList);
  } catch (e) {
    console.error("GET /api/user/transactions:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

/** POST: DEPRECATED - All transactions are now handled securely by the backend /api/razorpay/verify route */
export async function POST(request: Request) {
  return NextResponse.json({ error: "Direct transaction creation is disabled for security reasons." }, { status: 403 });
}
