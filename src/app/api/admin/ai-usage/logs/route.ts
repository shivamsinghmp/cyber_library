import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-helpers";

function esc(val: string | number | null | undefined): string {
  const s = String(val ?? "");
  return s.includes(",") || s.includes('"') || s.includes("\n")
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

/**
 * GET /api/admin/ai-usage/logs
 * Full paginated AI usage log with filters.
 * Query params:
 *   page      — page number (default 1)
 *   limit     — page size (default 50, max 100)
 *   provider  — "google" | "anthropic" | "openai"
 *   feature   — "studymate" | "studymate_meet" | etc.
 *   status    — "success" | "error" | "timeout"
 *   student   — search by name / email / studentId
 *   from      — ISO date (inclusive)
 *   to        — ISO date (inclusive)
 *   export    — "csv" to download CSV
 */
export async function GET(request: Request) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const page      = Math.max(1, Number(searchParams.get("page")  ?? 1));
    const limit     = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 50)));
    const provider  = searchParams.get("provider")?.trim() ?? "";
    const feature   = searchParams.get("feature")?.trim()  ?? "";
    const status    = searchParams.get("status")?.trim()   ?? "";
    const studentQ  = searchParams.get("student")?.trim()  ?? "";
    const from      = searchParams.get("from")?.trim()     ?? "";
    const to        = searchParams.get("to")?.trim()       ?? "";
    const exportCsv = searchParams.get("export") === "csv";
    const csvLimit  = 5000;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (provider) where.provider = provider;
    if (feature)  where.feature  = feature;
    if (status)   where.status   = status;
    if (from || to) {
      where.createdAt = {
        ...(from ? { gte: new Date(from) }                         : {}),
        ...(to   ? { lte: new Date(to + "T23:59:59.999Z") }       : {}),
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
      prisma.aIUsageLog.findMany({
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
        },
        orderBy: { createdAt: "desc" },
        skip:    exportCsv ? 0 : (page - 1) * limit,
        take:    exportCsv ? csvLimit : limit,
      }),
      prisma.aIUsageLog.count({ where }),
    ]);

    if (exportCsv) {
      const header = "Log ID,Student,Email,Student ID,Provider,Model,Feature,Input Tokens,Output Tokens,Total Tokens,Cost (INR),Coins,Latency (ms),Status,Time";
      const lines  = logs.map(l => [
        esc(l.logId),
        esc(l.user?.profile?.fullName ?? l.user?.name),
        esc(l.user?.email),
        esc(l.user?.studentId),
        esc(l.provider),
        esc(l.model),
        esc(l.feature),
        l.inputTokens,
        l.outputTokens,
        l.totalTokens,
        l.costInr.toFixed(4),
        l.coinsCharged,
        l.latencyMs,
        l.status,
        new Date(l.createdAt).toLocaleString("en-IN"),
      ].join(","));
      const csv = [header, ...lines].join("\r\n");
      return new NextResponse(csv, {
        headers: {
          "Content-Type":        "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="ai-usage-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    return NextResponse.json({
      data: logs.map(l => ({
        id:           l.id,
        logId:        l.logId,
        userId:       l.userId,
        userName:     l.user?.profile?.fullName ?? l.user?.name ?? "—",
        userEmail:    l.user?.email ?? "—",
        studentId:    l.user?.studentId ?? "—",
        provider:     l.provider,
        model:        l.model,
        feature:      l.feature,
        inputTokens:  l.inputTokens,
        outputTokens: l.outputTokens,
        totalTokens:  l.totalTokens,
        costInr:      l.costInr,
        coinsCharged: l.coinsCharged,
        latencyMs:    l.latencyMs,
        status:       l.status,
        errorMessage: l.errorMessage,
        createdAt:    l.createdAt,
      })),
      total,
      page,
      hasMore: (page - 1) * limit + logs.length < total,
    });
  } catch (e) {
    console.error("GET /api/admin/ai-usage/logs:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
