import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-helpers";

function esc(val: string | number | null | undefined): string {
  const s = String(val ?? "");
  return s.includes(",") || s.includes('"') || s.includes("\n")
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

function toIST(date: Date): string {
  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

/**
 * GET /api/admin/coins/student/[studentId]/log
 * Full coin log for a specific student — admin only.
 *
 * Query params: page, limit, filter (all|earned|spent), category, from, to, export (csv)
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ studentId: string }> },
) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { studentId } = await params;
    const userId = studentId;
    if (!userId) return NextResponse.json({ error: "Missing studentId" }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const page      = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit     = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50")));
    const filter    = searchParams.get("filter") ?? "all";
    const category  = searchParams.get("category")?.trim() ?? "";
    const from      = searchParams.get("from")?.trim();
    const to        = searchParams.get("to")?.trim();
    const exportCsv = searchParams.get("export") === "csv";
    const csvLimit  = 10000;

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

    // Fetch student info alongside logs
    const [student, logs, total] = await Promise.all([
      prisma.user.findUnique({
        where:  { id: userId },
        select: { name: true, email: true, studentId: true, profile: { select: { fullName: true, coinBalance: true } } },
      }),
      prisma.studyCoinLog.findMany({
        where,
        include: { admin: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        skip:    exportCsv ? 0 : (page - 1) * limit,
        take:    exportCsv ? csvLimit : limit,
      }),
      prisma.studyCoinLog.count({ where }),
    ]);

    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    if (exportCsv) {
      const header = "Txn ID,Type,Coins,Balance Before,Balance After,Source Category,Source Label,Reference Type,Reference ID,Reference Name,Device,IP Address,Admin Name,Admin Reason,Date (IST)";
      const lines  = logs.map(l => [
        esc(l.txnId ?? l.id),
        l.coins > 0 ? "Credit" : "Debit",
        Math.abs(l.coins),
        esc(l.balanceBefore),
        esc(l.balanceAfter),
        esc(l.sourceCategory),
        esc(l.sourceLabel),
        esc(l.referenceType),
        esc(l.referenceId),
        esc(l.referenceName),
        esc(l.deviceType),
        esc(l.ipAddress),
        esc(l.adminName ?? l.admin?.name),
        esc(l.adminReason),
        esc(toIST(new Date(l.createdAt))),
      ].join(","));
      const csv = [header, ...lines].join("\r\n");
      const name = student.profile?.fullName ?? student.name ?? userId;
      return new NextResponse(csv, {
        headers: {
          "Content-Type":        "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="coins-${name}-${new Date().toISOString().slice(0,10)}.csv"`,
        },
      });
    }

    return NextResponse.json({
      student: {
        id:        userId,
        name:      student.profile?.fullName ?? student.name ?? "—",
        email:     student.email,
        studentId: student.studentId,
        balance:   student.profile?.coinBalance ?? 0,
      },
      data: logs.map(l => ({
        id:             l.id,
        txnId:          l.txnId,
        type:           l.coins > 0 ? "credit" : "debit",
        coins:          Math.abs(l.coins),
        coinsDisplay:   l.coins > 0 ? `+${l.coins}` : `${l.coins}`,
        reason:         l.reason,
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
        ipAddress:      l.ipAddress,
        adminId:        l.adminId,
        adminName:      l.adminName ?? l.admin?.name ?? null,
        adminReason:    l.adminReason,
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
    console.error("GET /api/admin/coins/student/[studentId]/log:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
