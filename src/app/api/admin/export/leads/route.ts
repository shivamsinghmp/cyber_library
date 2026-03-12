import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/** GET: Export leads as CSV (for Excel) for admin. */
export async function GET() {
  try {
    const session = await auth();
    const role = (session?.user as { role?: string })?.role;
    if (!session?.user || role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const leads = await prisma.leadSubmission.findMany({
      orderBy: { createdAt: "desc" },
    });

    const header = ["id", "created_at", "name", "email", "mobile", "exam", "raw_json"];

    const rows = leads.map((l) => {
      const data = (l.data || {}) as Record<string, unknown>;
      const name =
        (data["full_name"] as string) ||
        (data["name"] as string) ||
        (data["student_name"] as string) ||
        "";
      const email =
        (data["email"] as string) ||
        (data["student_email"] as string) ||
        (data["contact_email"] as string) ||
        "";
      const mobile =
        (data["mobile"] as string) ||
        (data["phone"] as string) ||
        (data["whatsapp"] as string) ||
        "";
      const exam =
        (data["prepation"] as string) ||
        (data["preparation"] as string) ||
        (data["exam"] as string) ||
        (data["goal"] as string) ||
        "";

      const rawJson = JSON.stringify(data).replace(/"/g, '""'); // escape double quotes for CSV

      return [
        l.id,
        l.createdAt.toISOString(),
        name,
        email,
        mobile,
        exam,
        rawJson,
      ];
    });

    const csvLines = [
      header.join(","),
      ...rows.map((cols) =>
        cols
          .map((c) => {
            const s = c ?? "";
            return `"${String(s).replace(/"/g, '""')}"`;
          })
          .join(",")
      ),
    ];

    const csv = csvLines.join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="leads-export.csv"`,
      },
    });
  } catch (e) {
    console.error("GET /api/admin/export/leads:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

