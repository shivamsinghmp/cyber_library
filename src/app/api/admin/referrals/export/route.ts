import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-helpers";

function escapeCsv(val: string | null | undefined): string {
  const s = val ?? "";
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function fmt(date: Date | string | null): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

/** GET /api/admin/referrals/export — download referral data as CSV */
export async function GET(request: Request) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() ?? "";

    const where = {
      deletedAt: null,
      referrals: { some: {} },
      ...(q
        ? {
            OR: [
              { name:         { contains: q, mode: "insensitive" as const } },
              { email:        { contains: q, mode: "insensitive" as const } },
              { studentId:    { contains: q, mode: "insensitive" as const } },
              { referralCode: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const referrers = await prisma.user.findMany({
      where,
      select: {
        name: true,
        email: true,
        studentId: true,
        referralCode: true,
        referrals: {
          select: {
            name: true,
            email: true,
            studentId: true,
            createdAt: true,
            referralRewarded: true,
            deletedAt: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    const header = [
      "Referrer Name", "Referrer Email", "Referrer Student ID", "Referral Code",
      "Referred Name", "Referred Email", "Referred Student ID",
      "Join Date", "Status", "Rewarded",
    ].map(escapeCsv).join(",");

    const rows: string[] = [header];

    for (const r of referrers) {
      if (r.referrals.length === 0) continue;
      for (const ref of r.referrals) {
        rows.push([
          escapeCsv(r.name),
          escapeCsv(r.email),
          escapeCsv(r.studentId),
          escapeCsv(r.referralCode),
          escapeCsv(ref.name),
          escapeCsv(ref.email),
          escapeCsv(ref.studentId),
          escapeCsv(fmt(ref.createdAt)),
          ref.deletedAt ? "Inactive" : "Active",
          ref.referralRewarded ? "Yes" : "No",
        ].join(","));
      }
    }

    const csv = rows.join("\r\n");
    const filename = `referrals-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type":        "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    console.error("GET /api/admin/referrals/export:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
