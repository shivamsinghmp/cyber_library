import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireSuperAdmin } from "@/lib/api-helpers";

function esc(val: string | number | null | undefined): string {
  const s = String(val ?? "");
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return safe.includes(",") || safe.includes('"') || safe.includes("\n")
    ? `"${safe.replace(/"/g, '""')}"`
    : safe;
}

/**
 * GET /api/admin/coin-engine/students
 * Paginated student leaderboard sorted by coinBalance (desc).
 * Query params:
 *   q       — search by name / email / studentId
 *   page    — page number (default 1)
 *   export  — "csv" to download as CSV file
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q         = searchParams.get("q")?.trim() ?? "";
    const page      = Math.max(1, Number(searchParams.get("page") ?? 1));
    const exportCsv = searchParams.get("export") === "csv";
    const limit     = exportCsv ? 5000 : 50;

    // CSV export (bulk PII) requires super-admin; paginated view allows all admins
    const auth = exportCsv ? await requireSuperAdmin() : await requireAdmin();
    if (auth.error) return auth.error;

    const userWhere = {
      deletedAt: null as null,
      ...(q
        ? {
            OR: [
              { name:      { contains: q, mode: "insensitive" as const } },
              { email:     { contains: q, mode: "insensitive" as const } },
              { studentId: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [profiles, total] = await Promise.all([
      prisma.profile.findMany({
        where:   { user: userWhere },
        select: {
          userId:      true,
          coinBalance: true,
          user: {
            select: { id: true, name: true, email: true, studentId: true },
          },
        },
        orderBy: { coinBalance: "desc" },
        skip:    exportCsv ? 0 : (page - 1) * limit,
        take:    limit + 1,
      }),
      exportCsv ? Promise.resolve(0) : prisma.profile.count({ where: { user: userWhere } }),
    ]);

    const hasMore = !exportCsv && profiles.length > limit;
    const slice   = profiles.slice(0, limit);
    const userIds = slice.map(p => p.userId);

    // Last transaction date per student (one query)
    const lastTxns = userIds.length > 0
      ? await prisma.studyCoinLog.findMany({
          where:    { userId: { in: userIds } },
          select:   { userId: true, createdAt: true },
          orderBy:  { createdAt: "desc" },
          distinct: ["userId"],
        })
      : [];
    const lastTxnMap = Object.fromEntries(lastTxns.map(t => [t.userId, t.createdAt]));

    const rows = slice.map((p, i) => ({
      rank:       (exportCsv ? 0 : (page - 1) * limit) + i + 1,
      id:         p.user.id,
      name:       p.user.name       ?? "—",
      email:      p.user.email,
      studentId:  p.user.studentId  ?? "—",
      coinBalance: p.coinBalance,
      lastTxnAt:  lastTxnMap[p.userId]?.toISOString() ?? null,
    }));

    if (exportCsv) {
      const header = "Rank,Name,Email,Student ID,Coin Balance,Last Activity";
      const lines  = rows.map(r =>
        [
          r.rank,
          esc(r.name),
          esc(r.email),
          esc(r.studentId),
          r.coinBalance,
          r.lastTxnAt
            ? new Date(r.lastTxnAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
            : "",
        ].join(",")
      );
      const csv = [header, ...lines].join("\r\n");
      return new NextResponse(csv, {
        headers: {
          "Content-Type":        "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="coin-leaderboard-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    return NextResponse.json({ data: rows, page, hasMore, total });
  } catch (e) {
    console.error("GET /api/admin/coin-engine/students:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
