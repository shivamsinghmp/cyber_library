import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

function toIST(date: Date): string {
  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

const ICON_MAP: Record<string, string> = {
  coin_pack:        "shopping-cart",
  checkin_bonus:    "calendar-check",
  daily_streak:     "flame",
  study_session:    "timer",
  admin_grant:      "user-check",
  admin_deduct:     "user-minus",
  product_purchase: "book-open",
  ai_usage:         "sparkles",
  referral_bonus:   "users",
  welcome_bonus:    "gift",
  achievement:      "trophy",
  refund:           "refresh-cw",
  cashback:         "percent",
  subscription:     "star",
  course_unlock:    "book",
  quiz_attempt:     "help-circle",
};

const DEVICE_LABEL: Record<string, string> = {
  web_browser:  "Web Browser",
  mobile_app:   "Mobile App",
  admin_panel:  "Admin Panel",
  system:       "System",
};

/**
 * GET /api/student/coins/log
 * Paginated, filterable coin transaction history for the logged-in student.
 *
 * Query params:
 *   page     — default 1
 *   limit    — default 20, max 50
 *   filter   — all | earned | spent
 *   category — sourceCategory value
 *   from     — ISO date (inclusive)
 *   to       — ISO date (inclusive)
 */
export async function GET(request: Request) {
  try {
    const session = await auth();
    const userId = (session?.user as { id?: string })?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const page     = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit    = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20")));
    const filter   = searchParams.get("filter") ?? "all";
    const category = searchParams.get("category")?.trim() ?? "";
    const from     = searchParams.get("from")?.trim();
    const to       = searchParams.get("to")?.trim();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { userId };

    if (filter === "earned") where.coins = { gt: 0 };
    else if (filter === "spent") where.coins = { lt: 0 };

    if (category) where.sourceCategory = category;

    if (from || to) {
      where.createdAt = {
        ...(from ? { gte: new Date(from) }                     : {}),
        ...(to   ? { lte: new Date(to + "T23:59:59.999Z") }   : {}),
      };
    }

    const [logs, total] = await Promise.all([
      prisma.studyCoinLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip:    (page - 1) * limit,
        take:    limit,
        select: {
          id:             true,
          txnId:          true,
          coins:          true,
          reason:         true,
          sourceCategory: true,
          sourceLabel:    true,
          referenceType:  true,
          referenceId:    true,
          referenceName:  true,
          balanceBefore:  true,
          balanceAfter:   true,
          deviceType:     true,
          createdAt:      true,
        },
      }),
      prisma.studyCoinLog.count({ where }),
    ]);

    return NextResponse.json({
      data: logs.map(l => ({
        id:             l.id,
        txnId:          l.txnId,
        type:           l.coins > 0 ? "credit" : "debit",
        coins:          Math.abs(l.coins),
        coinsDisplay:   l.coins > 0 ? `+${l.coins}` : `${l.coins}`,
        sourceCategory: l.sourceCategory,
        sourceLabel:    l.sourceLabel ?? l.reason,
        referenceType:  l.referenceType,
        referenceId:    l.referenceId,
        referenceName:  l.referenceName,
        balanceBefore:  l.balanceBefore,
        balanceAfter:   l.balanceAfter,
        netChange:      l.balanceAfter != null && l.balanceBefore != null
                          ? l.balanceAfter - l.balanceBefore
                          : l.coins,
        deviceType:     l.deviceType,
        deviceLabel:    DEVICE_LABEL[l.deviceType ?? "web_browser"] ?? "Unknown",
        iconName:       ICON_MAP[l.sourceCategory ?? ""] ?? "coin",
        createdAt:      l.createdAt,
        createdAtIST:   toIST(l.createdAt),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore:    page * limit < total,
    });
  } catch (e) {
    console.error("GET /api/student/coins/log:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
