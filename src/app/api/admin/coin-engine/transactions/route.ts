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
 * GET /api/admin/coin-engine/transactions
 * Full paginated transaction log with filters.
 * Query params:
 *   type     — all | credit | debit | admin
 *   category — sourceCategory value
 *   from     — ISO date string (inclusive)
 *   to       — ISO date string (inclusive)
 *   student  — search by student name / email / studentId
 *   page     — page number (default 1)
 *   export   — "csv" to download
 */
export async function GET(request: Request) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const type      = searchParams.get("type")     ?? "all";
    const category  = searchParams.get("category")?.trim() ?? "";
    const from      = searchParams.get("from")?.trim();
    const to        = searchParams.get("to")?.trim();
    const studentQ  = searchParams.get("student")?.trim() ?? "";
    const page      = Math.max(1, Number(searchParams.get("page") ?? 1));
    const exportCsv = searchParams.get("export") === "csv";
    const limit     = exportCsv ? 10000 : 50;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (type === "credit") where.coins   = { gt: 0 };
    else if (type === "debit")  where.coins   = { lt: 0 };
    else if (type === "admin")  where.adminId = { not: null };

    if (category) where.sourceCategory = category;

    if (from || to) {
      where.createdAt = {
        ...(from ? { gte: new Date(from) }                       : {}),
        ...(to   ? { lte: new Date(to + "T23:59:59.999Z") }     : {}),
      };
    }

    if (studentQ) {
      where.user = {
        OR: [
          { name:      { contains: studentQ, mode: "insensitive" } },
          { email:     { contains: studentQ, mode: "insensitive" } },
          { studentId: { contains: studentQ, mode: "insensitive" } },
        ],
      };
    }

    const [logs, total] = await Promise.all([
      prisma.studyCoinLog.findMany({
        where,
        include: {
          user: {
            select: {
              name:      true,
              email:     true,
              studentId: true,
              profile:   { select: { fullName: true } },
            },
          },
          admin: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip:    exportCsv ? 0 : (page - 1) * limit,
        take:    limit,
      }),
      prisma.studyCoinLog.count({ where }),
    ]);

    if (exportCsv) {
      const header = "Txn ID,Student Name,Email,Student ID,Type,Coins,Balance Before,Balance After,Source Category,Source Label,Reference,Reason,Admin,Admin Reason,Device,IP,Date (IST)";
      const lines  = logs.map(l => [
        esc(l.txnId ?? l.id),
        esc(l.user.profile?.fullName ?? l.user.name),
        esc(l.user.email),
        esc(l.user.studentId),
        l.coins > 0 ? "Credit" : "Debit",
        Math.abs(l.coins),
        esc(l.balanceBefore),
        esc(l.balanceAfter),
        esc(l.sourceCategory),
        esc(l.sourceLabel),
        esc(l.referenceName ?? l.referenceId),
        esc(l.reason),
        esc(l.adminName ?? l.admin?.name),
        esc(l.adminReason),
        esc(l.deviceType),
        esc(l.ipAddress),
        esc(toIST(new Date(l.createdAt))),
      ].join(","));
      const csv = [header, ...lines].join("\r\n");
      return new NextResponse(csv, {
        headers: {
          "Content-Type":        "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="coin-transactions-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    return NextResponse.json({
      data: logs.map(l => ({
        id:             l.id,
        txnId:          l.txnId,
        userId:         l.userId,
        userName:       l.user.profile?.fullName ?? l.user.name ?? "—",
        userEmail:      l.user.email,
        studentId:      l.user.studentId,
        type:           l.coins > 0 ? "credit" : "debit",
        coins:          l.coins,
        coinsAbs:       Math.abs(l.coins),
        reason:         l.reason,
        sourceCategory: l.sourceCategory,
        sourceLabel:    l.sourceLabel,
        referenceType:  l.referenceType,
        referenceId:    l.referenceId,
        referenceName:  l.referenceName,
        balanceBefore:  l.balanceBefore,
        balanceAfter:   l.balanceAfter,
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
      hasMore: !exportCsv && (page - 1) * limit + logs.length < total,
    });
  } catch (e) {
    console.error("GET /api/admin/coin-engine/transactions:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
