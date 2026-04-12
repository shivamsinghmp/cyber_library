import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    const role = (session?.user as { role?: string })?.role;
    if (role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const rules = await prisma.actionReward.findMany({ orderBy: { actionKey: "asc" } });
    return NextResponse.json(rules);
  } catch (error) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    const role = (session?.user as { role?: string })?.role;
    if (role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const data = await request.json(); // Expecting array of rules
    
    for (const rule of data) {
      await prisma.actionReward.upsert({
        where: { actionKey: rule.actionKey },
        create: {
          actionKey: rule.actionKey,
          label: rule.label || rule.actionKey,
          coins: Number(rule.coins),
          isActive: rule.isActive
        },
        update: {
          label: rule.label,
          coins: Number(rule.coins),
          isActive: rule.isActive
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT /api/admin/coin-engine:", error);
    return NextResponse.json({ error: "Failed to update rules" }, { status: 500 });
  }
}
