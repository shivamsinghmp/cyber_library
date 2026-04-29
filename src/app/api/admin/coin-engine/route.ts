import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/api-helpers";

export async function GET() {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    const { user } = auth;

    const rules = await prisma.actionReward.findMany({ orderBy: { actionKey: "asc" } });
    return NextResponse.json(rules);
  } catch (error) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    const { user } = auth;

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
