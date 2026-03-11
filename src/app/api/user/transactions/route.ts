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
    const userId = (session?.user as { id?: string })?.id;
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
      },
    });

    return NextResponse.json(list);
  } catch (e) {
    console.error("GET /api/user/transactions:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

/** POST: Create a transaction (after successful order/payment) */
export async function POST(request: Request) {
  try {
    const session = await auth();
    const userId = (session?.user as { id?: string })?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const transactionId = await generateTransactionId();
    const txn = await prisma.transaction.create({
      data: {
        transactionId,
        userId,
        amount: parsed.data.amount,
        currency: "INR",
        status: parsed.data.status,
        paymentGatewayId: parsed.data.paymentGatewayId ?? null,
        orderDetails: parsed.data.orderDetails
          ? (parsed.data.orderDetails as object)
          : undefined,
      },
    });

    // Digital product purchases: grant access for each productId in orderDetails
    if (parsed.data.status === "SUCCESS" && parsed.data.orderDetails?.length) {
      for (const item of parsed.data.orderDetails) {
        const productId = item.productId;
        if (productId) {
          const product = await prisma.digitalProduct.findUnique({
            where: { id: productId, isActive: true },
          });
          if (product) {
            await prisma.digitalPurchase.create({
              data: {
                userId,
                productId,
                transactionId: txn.transactionId,
              },
            });
          }
        }
      }
    }

    // Referral reward: only on first successful purchase
    if (parsed.data.status === "SUCCESS") {
      try {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            referredById: true,
            referralRewarded: true,
          },
        });
        if (user && user.referredById && !user.referralRewarded) {
          // Check there is at least one successful transaction (this one counts)
          const successCount = await prisma.transaction.count({
            where: { userId, status: "SUCCESS" },
          });
          if (successCount >= 1) {
            // Find an active referral reward
            const reward = await prisma.reward.findFirst({
              where: {
                type: "REFERRAL",
                isActive: true,
              },
              orderBy: { createdAt: "desc" },
            });
            if (reward) {
              await prisma.$transaction([
                prisma.rewardWinner.create({
                  data: {
                    userId,
                    rewardId: reward.id,
                    status: "PENDING",
                  },
                }),
                prisma.rewardWinner.create({
                  data: {
                    userId: user.referredById,
                    rewardId: reward.id,
                    status: "PENDING",
                  },
                }),
                prisma.user.update({
                  where: { id: userId },
                  data: { referralRewarded: true },
                }),
              ]);
            } else {
              console.warn(
                "[Referral] No active REFERRAL reward configured; skipping referral reward."
              );
            }
          }
        }
      } catch (e) {
        console.error("Error processing referral reward:", e);
      }
    }

    return NextResponse.json({
      id: txn.id,
      transactionId: txn.transactionId,
      amount: txn.amount,
      status: txn.status,
      createdAt: txn.createdAt,
    });
  } catch (e) {
    console.error("POST /api/user/transactions:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
