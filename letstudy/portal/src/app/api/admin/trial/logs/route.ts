import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-helpers";

function esc(val: string | number | null | undefined): string {
  const s = String(val ?? "");
  return s.includes(",") || s.includes('"') || s.includes("\n")
    ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * GET /api/admin/trial/logs
 * Paginated list of all trial subscriptions with user info and status.
 * Query params:
 *   status  — active | expired | converted | all (default)
 *   search  — name / email / studentId
 *   from    — ISO date
 *   to      — ISO date
 *   page    — page number (default 1)
 *   export  — "csv"
 */
export async function GET(request: Request) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const status    = searchParams.get("status")  ?? "all";
    const search    = searchParams.get("search")?.trim() ?? "";
    const from      = searchParams.get("from")?.trim() ?? "";
    const to        = searchParams.get("to")?.trim()   ?? "";
    const page      = Math.max(1, Number(searchParams.get("page") ?? 1));
    const exportCsv = searchParams.get("export") === "csv";
    const limit     = exportCsv ? 5000 : 50;
    const now       = new Date();

    // Build where clause on UserSubscription
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subWhere: any = { planType: "TRIAL" };

    if (status === "active")    { subWhere.status = "ACTIVE"; subWhere.endDate = { gt: now }; }
    else if (status === "expired")  { subWhere.status = "EXPIRED"; }
    else if (status === "cancelled") { subWhere.status = "CANCELLED"; }

    if (from || to) {
      subWhere.startDate = {
        ...(from ? { gte: new Date(from) }                         : {}),
        ...(to   ? { lte: new Date(to + "T23:59:59.999Z") }       : {}),
      };
    }

    if (search) {
      subWhere.user = {
        OR: [
          { name:      { contains: search, mode: "insensitive" } },
          { email:     { contains: search, mode: "insensitive" } },
          { studentId: { contains: search, mode: "insensitive" } },
        ],
      };
    }

    const [rows, total] = await Promise.all([
      prisma.userSubscription.findMany({
        where:   subWhere,
        include: {
          user: {
            select: {
              id: true, name: true, email: true, studentId: true,
              trialUsed: true,
              profile:   { select: { phone: true, whatsappNumber: true } },
              userSubscriptions: {
                where:  { planType: { in: ["MONTHLY", "YEARLY"] } },
                select: { planType: true, status: true },
                take:   1,
                orderBy: { startDate: "desc" },
              },
            },
          },
        },
        orderBy: { startDate: "desc" },
        skip:    exportCsv ? 0 : (page - 1) * limit,
        take:    limit,
      }),
      prisma.userSubscription.count({ where: subWhere }),
    ]);

    const data = rows.map(r => {
      const daysLeft = Math.ceil((r.endDate.getTime() - now.getTime()) / 86_400_000);
      const paid = r.user.userSubscriptions[0];
      return {
        userId:      r.user.id,
        name:        r.user.name ?? "—",
        email:       r.user.email,
        studentId:   r.user.studentId ?? "—",
        phone:       r.user.profile?.whatsappNumber ?? r.user.profile?.phone ?? "—",
        startDate:   r.startDate,
        endDate:     r.endDate,
        daysLeft:    Math.max(0, daysLeft),
        subStatus:   r.status,
        converted:   !!paid,
        convertedPlan: paid?.planType ?? null,
        ip:          null, // not tracked on trial sub
      };
    });

    if (exportCsv) {
      const header = "Name,Email,Student ID,Phone,Trial Start,Trial End,Days Left,Status,Converted,Plan";
      const lines  = data.map(d => [
        esc(d.name), esc(d.email), esc(d.studentId), esc(d.phone),
        new Date(d.startDate).toLocaleDateString("en-IN"),
        new Date(d.endDate).toLocaleDateString("en-IN"),
        d.daysLeft,
        d.subStatus,
        d.converted ? "Yes" : "No",
        esc(d.convertedPlan),
      ].join(","));
      const csv = [header, ...lines].join("\r\n");
      return new NextResponse(csv, {
        headers: {
          "Content-Type":        "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="trial-logs-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    return NextResponse.json({ data, total, page, hasMore: (page - 1) * limit + rows.length < total });
  } catch (e) {
    console.error("GET /api/admin/trial/logs:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
