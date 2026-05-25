import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/api-helpers";
import { getAppSetting, setAppSetting } from "@/lib/app-settings";

export async function GET() {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;

    const [rules, checkinRaw] = await Promise.all([
      prisma.actionReward.findMany({ orderBy: { actionKey: "asc" } }),
      getAppSetting("CHECKIN_COINS"),
    ]);
    const checkinCoins = checkinRaw ? Math.max(1, parseInt(checkinRaw)) : 5;
    return NextResponse.json({ rules, checkinCoins });
  } catch (error) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

/** PATCH: update only the checkin coins setting */
export async function PATCH(request: Request) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;

    const body = await request.json().catch(() => ({}));
    const coins = parseInt(body.checkinCoins);
    if (!Number.isFinite(coins) || coins < 1) {
      return NextResponse.json({ error: "checkinCoins must be >= 1" }, { status: 400 });
    }
    await setAppSetting("CHECKIN_COINS", String(coins));
    return NextResponse.json({ success: true, checkinCoins: coins });
  } catch (error) {
    console.error("PATCH /api/admin/coin-engine:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;

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
