import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSales } from "@/lib/api-helpers";

function extractField(data: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    if (typeof data[key] === "string" && data[key]) return data[key] as string;
  }
  return null;
}

/**
 * Pulls in LeadSubmission rows and STUDENT signups that don't yet have a
 * CrmContact (tracked via sourceLeadId/sourceUserId), creating new NEW-stage
 * contacts. Manual button, not a cron — keeps this app self-contained.
 */
export async function POST() {
  const auth = await requireSales();
  if (auth.error) return auth.error;

  try {
    const [linkedLeadIds, linkedUserIds] = await Promise.all([
      prisma.crmContact.findMany({ where: { sourceLeadId: { not: null } }, select: { sourceLeadId: true } })
        .then(rows => new Set(rows.map(r => r.sourceLeadId))),
      prisma.crmContact.findMany({ where: { sourceUserId: { not: null } }, select: { sourceUserId: true } })
        .then(rows => new Set(rows.map(r => r.sourceUserId))),
    ]);

    const [leads, students] = await Promise.all([
      prisma.leadSubmission.findMany({ orderBy: { createdAt: "desc" }, take: 500 }),
      prisma.user.findMany({
        where: { role: "STUDENT", deletedAt: null },
        select: { id: true, name: true, email: true, profile: { select: { phone: true, whatsappNumber: true } } },
        orderBy: { createdAt: "desc" },
        take: 500,
      }),
    ]);

    const newLeads = leads.filter(l => !linkedLeadIds.has(l.id));
    const newStudents = students.filter(s => !linkedUserIds.has(s.id));

    let created = 0;

    for (const lead of newLeads) {
      const data = (lead.data ?? {}) as Record<string, unknown>;
      await prisma.crmContact.create({
        data: {
          name: extractField(data, "full_name", "name", "student_name"),
          email: extractField(data, "email", "student_email", "contact_email"),
          phone: extractField(data, "mobile", "phone", "whatsapp"),
          source: "LEAD_SUBMISSION",
          sourceLeadId: lead.id,
          stage: "NEW",
        },
      });
      created++;
    }

    for (const student of newStudents) {
      await prisma.crmContact.create({
        data: {
          name: student.name,
          email: student.email,
          phone: student.profile?.phone || student.profile?.whatsappNumber || null,
          source: "SIGNUP",
          sourceUserId: student.id,
          stage: "NEW",
        },
      });
      created++;
    }

    return NextResponse.json({ created, scannedLeads: leads.length, scannedStudents: students.length });
  } catch (e) {
    console.error("POST /api/admin/pipeline/sync:", e);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
