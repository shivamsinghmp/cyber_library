import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/** GET: Current user's reward winnings */
export async function GET() {
  try {
    const session = await auth();
    const userId = (session?.user as { id?: string })?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const list = await prisma.rewardWinner.findMany({
      where: { userId },
      orderBy: { wonAt: "desc" },
      include: {
        reward: { select: { id: true, name: true, amount: true, type: true } },
      },
    });
    return NextResponse.json(list);
  } catch (e) {
    console.error("GET /api/user/rewards:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
