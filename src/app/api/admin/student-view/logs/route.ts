import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-helpers";

function esc(v: string | number | null | undefined): string {
  const s = String(v ?? "");
  return s.includes(",") || s.includes('"') || s.includes("\n")
    ? `"${s.replace(/"/g, '""')}"` : s;
}

function toIST(d: Date): string {
  return d.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

/**
 * GET /api/admin/student-view/logs
 * Paginated access log with filters.
 * Query params: adminId, studentId, date (today | YYYY-MM-DD), page, export (csv)
 */
export async function GET(request: Request) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const adminIdFilter   = searchParams.get("adminId")?.trim() ?? "";
    const studentIdFilter = searchParams.get("studentId")?.trim() ?? "";
    const dateFilter      = searchParams.get("date")?.trim() ?? "today";
    const page            = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const exportCsv       = searchParams.get("export") === "csv";
    const limit           = exportCsv ? 5000 : 50;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (adminIdFilter)   where.adminId   = adminIdFilter;
    if (studentIdFilter) where.studentId = studentIdFilter;

    if (dateFilter) {
      const now = new Date();
      if (dateFilter === "today") {
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        where.accessedAt = { gte: todayStart };
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(dateFilter)) {
        const d = new Date(dateFilter);
        const next = new Date(d); next.setDate(next.getDate() + 1);
        where.accessedAt = { gte: d, lt: next };
      }
    }

    const [logs, total] = await Promise.all([
      prisma.adminStudentAccessLog.findMany({
        where,
        orderBy: { accessedAt: "desc" },
        skip:    exportCsv ? 0 : (page - 1) * limit,
        take:    limit,
      }),
      prisma.adminStudentAccessLog.count({ where }),
    ]);

    if (exportCsv) {
      const header = "ID,Admin Name,Admin ID,Admin IP,Student Name,Student ID,Student UID,Page,Action,Accessed At (IST),Ended At (IST)";
      const lines  = logs.map(l => [
        esc(l.id),
        esc(l.adminName),
        esc(l.adminId),
        esc(l.adminIp),
        esc(l.studentName),
        esc(l.studentId),
        esc(l.studentUniqueId),
        esc(l.pageAccessed),
        esc(l.action),
        esc(toIST(l.accessedAt)),
        esc(l.endedAt ? toIST(l.endedAt) : ""),
      ].join(","));
      const csv = [header, ...lines].join("\r\n");
      return new NextResponse(csv, {
        headers: {
          "Content-Type":        "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="student-view-logs-${new Date().toISOString().slice(0,10)}.csv"`,
        },
      });
    }

    return NextResponse.json({
      data: logs.map(l => ({
        id:             l.id,
        adminId:        l.adminId,
        adminName:      l.adminName,
        adminIp:        l.adminIp,
        studentId:      l.studentId,
        studentUniqueId: l.studentUniqueId,
        studentName:    l.studentName,
        pageAccessed:   l.pageAccessed,
        action:         l.action,
        accessedAt:     l.accessedAt,
        accessedAtIST:  toIST(l.accessedAt),
        endedAt:        l.endedAt,
      })),
      total,
      page,
      hasMore: page * limit < total,
    });
  } catch (e) {
    console.error("GET /api/admin/student-view/logs:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
